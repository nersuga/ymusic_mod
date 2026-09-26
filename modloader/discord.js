"use strict";
// Discord Rich Presence over the local IPC pipe of the Discord client (no dependencies).
// Frame: int32 LE opcode, int32 LE length, JSON. Opcodes: 0 handshake, 1 frame, 2 close, 3 ping, 4 pong.
const net = require("net");

const OP = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 };
// Where Discord listens: a named pipe on Windows; a Unix socket on Linux, in the runtime folder or, for the Flatpak
// and Snap builds, in their own subfolders of it
const pipePaths = (() => {
  if (process.platform === "win32") return Array.from({ length: 10 }, (_, i) => `\\\\?\\pipe\\discord-ipc-${i}`);
  const runtime = process.env.XDG_RUNTIME_DIR || "";
  const dirs = [...new Set([runtime, runtime && `${runtime}/app/com.discordapp.Discord`, runtime && `${runtime}/app/com.discordapp.DiscordCanary`,
    runtime && `${runtime}/snap.discord`, process.env.TMPDIR || "", "/tmp"].filter(Boolean))];
  return dirs.flatMap((d) => Array.from({ length: 10 }, (_, i) => `${d}/discord-ipc-${i}`));
})();

class DiscordPresence {
  constructor(log) {
    this.log = log;
    this.clientId = "";
    this.socket = null;
    this.ready = false;
    this.connecting = false;
    this.activity = null; // last requested activity (null = cleared)
    this.sent = ""; this.sentActivity = null;
    this.retryTimer = null;
    this.nonce = 0;
    this.status = "off"; // off | connecting | connected | no-discord | error
  }

  // enabled + clientId from the config; safe to call on every config change
  configure(enabled, clientId) {
    clientId = String(clientId || "").trim();
    if (!enabled || !/^\d{15,22}$/.test(clientId)) {
      this.clientId = "";
      this.status = enabled ? "error" : "off";
      this.disconnect();
      return;
    }
    if (clientId !== this.clientId) { this.disconnect(); this.clientId = clientId; }
    if (!this.socket) this.connect();
  }

  connect(index = 0) {
    if (!this.clientId || this.socket || this.connecting) return;
    if (index >= pipePaths.length) { this.status = "no-discord"; this.scheduleRetry(); return; }
    this.connecting = true;
    this.status = "connecting";
    const socket = net.createConnection(pipePaths[index]);
    let buffer = Buffer.alloc(0);
    socket.once("connect", () => {
      this.connecting = false;
      this.socket = socket;
      this.write(OP.HANDSHAKE, { v: 1, client_id: this.clientId });
    });
    socket.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);
      while (buffer.length >= 8) {
        const op = buffer.readInt32LE(0), len = buffer.readInt32LE(4);
        if (buffer.length < 8 + len) break;
        let payload = null;
        try { payload = JSON.parse(buffer.subarray(8, 8 + len).toString("utf8")); } catch {}
        buffer = buffer.subarray(8 + len);
        this.onMessage(op, payload);
      }
    });
    socket.once("error", () => {
      if (this.socket !== socket) {
        // this pipe index does not exist: try the next one
        this.connecting = false;
        socket.destroy();
        this.connect(index + 1);
      }
    });
    socket.once("close", () => {
      if (this.socket === socket) {
        this.log.info("discord: disconnected");
        this.socket = null;
        this.ready = false;
        this.sent = ""; this.sentActivity = null;
        this.status = "no-discord";
        this.scheduleRetry();
      }
    });
  }

  onMessage(op, payload) {
    if (op === OP.PING) { this.write(OP.PONG, payload); return; }
    if (op === OP.CLOSE) {
      this.log.error("discord: closed", payload && payload.message);
      this.status = "error";
      this.disconnect();
      return;
    }
    if (payload && payload.evt === "READY") {
      this.ready = true;
      this.status = "connected";
      this.log.info("discord: connected as", payload.data && payload.data.user && payload.data.user.username);
      this.flush();
    } else if (payload && payload.evt === "ERROR") {
      this.log.error("discord:", payload.data && payload.data.message);
    }
  }

  scheduleRetry() {
    clearTimeout(this.retryTimer);
    if (this.clientId) this.retryTimer = setTimeout(() => this.connect(), 15000);
  }

  disconnect() {
    clearTimeout(this.retryTimer);
    const s = this.socket;
    this.socket = null;
    this.ready = false;
    this.sent = ""; this.sentActivity = null;
    if (s) { try { s.end(); s.destroy(); } catch {} }
  }

  write(op, data) {
    if (!this.socket) return;
    const json = Buffer.from(JSON.stringify(data), "utf8");
    const head = Buffer.alloc(8);
    head.writeInt32LE(op, 0);
    head.writeInt32LE(json.length, 4);
    try { this.socket.write(Buffer.concat([head, json])); } catch {}
  }

  setActivity(activity) {
    this.activity = activity;
    this.flush();
  }

  flush() {
    if (!this.ready) return;
    const json = JSON.stringify(this.activity);
    if (json === this.sent) return;
    // Same track, only the timestamps moved by the jitter of the reported position: not worth an update
    const prev = this.sentActivity;
    const a = this.activity;
    if (prev && a && prev.timestamps && a.timestamps && Math.abs(prev.timestamps.start - a.timestamps.start) < 3000 &&
        JSON.stringify({ ...prev, timestamps: 0 }) === JSON.stringify({ ...a, timestamps: 0 })) return;
    this.sent = json;
    this.sentActivity = a;
    this.write(OP.FRAME, { cmd: "SET_ACTIVITY", args: { pid: process.pid, activity: this.activity || undefined }, nonce: String(++this.nonce) });
  }
}

// Discord limits: 2..128 characters for text fields
const clip = (s, max = 128) => {
  s = String(s || "").trim();
  if (s.length > max) s = s.slice(0, max - 1) + "…";
  return s.length < 2 ? (s + "  ").slice(0, 2) : s;
};

// Activity for the current track ("Listening to …"). state: { title, artist, album, cover, playing, position, duration, trackId, albumId }
const activityFor = (state, { showPaused, buttonLabel }) => {
  if (!state || !state.title) return null;
  if (!state.playing && !showPaused) return null;
  const activity = {
    type: 2, // "Listening to"
    details: clip(state.title),
    state: clip(state.artist || "—"),
    assets: {},
    instance: false,
  };
  if (state.cover && /^https:\/\//.test(state.cover)) {
    activity.assets.large_image = state.cover;
    if (state.album) activity.assets.large_text = clip(state.album);
  }
  if (state.playing && state.duration > 0 && Number.isFinite(state.position)) {
    const start = Date.now() - Math.max(0, state.position) * 1000;
    activity.timestamps = { start: Math.round(start), end: Math.round(start + state.duration * 1000) };
  }
  if (state.trackId && state.albumId) {
    activity.buttons = [{ label: clip(buttonLabel, 32), url: `https://music.yandex.ru/album/${state.albumId}/track/${state.trackId}` }];
  }
  if (!Object.keys(activity.assets).length) delete activity.assets;
  return activity;
};

module.exports = { DiscordPresence, activityFor };
