"use strict";
// Local API and the OBS "now playing" widget: a small HTTP server on 127.0.0.1 only.
//   GET  /widget              — overlay page for OBS (browser source), options in the query string
//   GET  /api/now             — current track as JSON
//   GET  /api/events          — the same as a stream (Server-Sent Events), pushed on every change
//   POST /api/cmd/<command>   — player commands; needs the token: "Authorization: Bearer <token>" or ?token=
// Safety: bound to the loopback interface; requests with a foreign Host header are refused (DNS rebinding);
// no CORS headers, so web pages cannot read the state or the token; commands always need the token.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const COMMANDS = ["playPause", "play", "pause", "next", "prev", "like", "dislike", "shuffle", "repeat", "volumeUp", "volumeDown"];
const FONTS = { "text.woff2": "YSText-Regular.woff2", "medium.woff2": "YSText-Medium.woff2", "bold.woff2": "YSText-Bold.woff2" };

class LocalApi {
  constructor({ log, widgetFile, fontsDir, getState, runCommand }) {
    this.log = log;
    this.widgetFile = widgetFile;
    this.fontsDir = fontsDir;
    this.getState = getState;
    this.runCommand = runCommand;
    this.server = null;
    this.port = 0;
    this.token = "";
    this.clients = new Set();
    this.lastJson = "";
    this.status = "off"; // off | on | error
    this.error = "";
  }

  static newToken() { return crypto.randomBytes(18).toString("base64url"); }

  configure(enabled, port, token) {
    this.token = token || "";
    port = Number(port) || 24850;
    if (!enabled) { this.stop(); return; }
    if (this.server && this.port === port) return;
    this.stop();
    this.start(port);
  }

  start(port) {
    const server = http.createServer((req, res) => this.handle(req, res));
    server.on("error", (e) => {
      this.status = "error";
      this.error = e.code === "EADDRINUSE" ? "port-busy" : String(e.message || e);
      this.log.error("local api", e.message);
      this.server = null;
    });
    server.listen(port, "127.0.0.1", () => {
      this.status = "on";
      this.error = "";
      this.log.info("local api listening on 127.0.0.1:" + port);
    });
    this.server = server;
    this.port = port;
  }

  stop() {
    for (const c of this.clients) { try { c.end(); } catch {} }
    this.clients.clear();
    if (this.server) { try { this.server.close(); } catch {} }
    this.server = null;
    this.status = "off";
  }

  // Current state for clients: position extrapolation needs the time it was measured at
  snapshot() {
    const s = this.getState() || {};
    return {
      title: s.title || "", artist: s.artist || "", album: s.album || "", cover: s.cover || "",
      playing: !!s.playing, liked: !!s.liked, position: s.position || 0, duration: s.duration || 0,
      volume: typeof s.volume === "number" ? s.volume : null, trackId: s.trackId || "", albumId: s.albumId || "",
      url: s.trackId && s.albumId ? `https://music.yandex.ru/album/${s.albumId}/track/${s.trackId}` : "",
      codec: s.codec || "", bitrate: s.bitrate || 0, accent: s.accent || "", at: Date.now(),
    };
  }

  // Called on every state report of the page
  push() {
    if (!this.clients.size) return;
    const snap = this.snapshot();
    const { at, ...rest } = snap;
    const json = JSON.stringify(rest);
    // position moves every report: send when something else changed or every 5 s to resync the clock
    if (json === this.lastJson && Date.now() - (this.lastPush || 0) < 5000) return;
    this.lastJson = json;
    this.lastPush = Date.now();
    const data = `data: ${JSON.stringify(snap)}\n\n`;
    for (const c of this.clients) { try { c.write(data); } catch { this.clients.delete(c); } }
  }

  handle(req, res) {
    const send = (code, body, type = "application/json; charset=utf-8", extra = {}) => {
      res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra });
      res.end(body);
    };
    // DNS rebinding: only our own host names
    const host = String(req.headers.host || "").toLowerCase();
    if (host !== `127.0.0.1:${this.port}` && host !== `localhost:${this.port}`) return send(403, '{"error":"forbidden host"}');
    let url;
    try { url = new URL(req.url, `http://${host}`); } catch { return send(400, '{"error":"bad url"}'); }
    const p = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "GET" && (p === "/widget" || p === "/")) {
      try { return send(200, fs.readFileSync(this.widgetFile), "text/html; charset=utf-8", { "Content-Security-Policy": "default-src 'self'; img-src https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'" }); }
      catch { return send(500, '{"error":"widget missing"}'); }
    }
    if (req.method === "GET" && p.startsWith("/fonts/")) {
      const name = FONTS[p.slice(7)];
      if (!name) return send(404, "{}");
      try { return send(200, fs.readFileSync(path.join(this.fontsDir, name)), "font/woff2", { "Cache-Control": "max-age=86400" }); }
      catch { return send(404, "{}"); }
    }
    if (req.method === "GET" && p === "/api/now") return send(200, JSON.stringify(this.snapshot()));
    if (req.method === "GET" && p === "/api/events") {
      res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", Connection: "keep-alive" });
      res.write(`retry: 2000\ndata: ${JSON.stringify(this.snapshot())}\n\n`);
      this.clients.add(res);
      const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 20000);
      req.on("close", () => { clearInterval(ping); this.clients.delete(res); });
      return;
    }
    if (req.method === "POST" && p.startsWith("/api/cmd/")) {
      const auth = String(req.headers.authorization || "");
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : url.searchParams.get("token") || "";
      const ok = this.token && token.length === this.token.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(this.token));
      if (!ok) return send(401, '{"error":"token required"}');
      const name = p.slice(9);
      if (!COMMANDS.includes(name)) return send(404, JSON.stringify({ error: "unknown command", commands: COMMANDS }));
      this.runCommand(name);
      return send(200, '{"ok":true}');
    }
    if (req.method === "GET" && p === "/api") {
      return send(200, JSON.stringify({ endpoints: ["GET /widget", "GET /api/now", "GET /api/events", "POST /api/cmd/<command> (token)"], commands: COMMANDS }));
    }
    return send(404, '{"error":"not found"}');
  }
}

module.exports = { LocalApi, COMMANDS };
