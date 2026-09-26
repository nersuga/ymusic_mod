"use strict";
// Last.fm scrobbler: web auth (token -> browser -> session key), "now playing" and scrobbles.
// Rules (last.fm/api/scrobbling): a track longer than 30 s is scrobbled once it has played for half its
// duration or for 4 minutes, whichever comes first; the timestamp is when the track started.
const crypto = require("crypto");

const API = "https://ws.audioscrobbler.com/2.0/";

class LastFm {
  constructor(log) {
    this.log = log;
    this.apiKey = "";
    this.secret = "";
    this.session = "";
    this.track = null; // { key, artist, title, album, duration, startedAt, played, scrobbled, nowPlayingSent }
    this.lastTick = 0;
    this.queue = []; // scrobbles that failed because of the network, retried later
  }

  configure({ apiKey, apiSecret, sessionKey }) {
    this.apiKey = String(apiKey || "").trim();
    this.secret = String(apiSecret || "").trim();
    this.session = String(sessionKey || "").trim();
  }

  get ready() { return !!(this.apiKey && this.secret && this.session); }

  sign(params) {
    const base = Object.keys(params).filter((k) => k !== "format" && k !== "callback").sort().map((k) => k + params[k]).join("");
    return crypto.createHash("md5").update(base + this.secret, "utf8").digest("hex");
  }

  async call(method, params = {}, { signed = true, post = true } = {}) {
    const all = { ...params, method, api_key: this.apiKey };
    if (signed) all.api_sig = this.sign(all);
    all.format = "json";
    const body = new URLSearchParams(all).toString();
    const res = await fetch(post ? API : `${API}?${body}`, post
      ? { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
      : undefined);
    const json = await res.json().catch(() => ({}));
    if (json.error) {
      const err = new Error(json.message || "Last.fm error " + json.error);
      err.code = json.error;
      throw err;
    }
    return json;
  }

  // Step 1: a request token and the page where the user allows access
  async beginAuth() {
    const { token } = await this.call("auth.getToken", {}, { post: false });
    return { token, url: `https://www.last.fm/api/auth/?api_key=${encodeURIComponent(this.apiKey)}&token=${encodeURIComponent(token)}` };
  }

  // Step 2: poll until the user has allowed access in the browser (error 14 = not yet authorized)
  async finishAuth(token, { timeoutMs = 180000, intervalMs = 3000, isCancelled = () => false } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && !isCancelled()) {
      try {
        const { session } = await this.call("auth.getSession", { token });
        return { key: session.key, name: session.name };
      } catch (e) {
        if (e.code !== 14) throw e;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error("timeout");
  }

  // Called with every state report of the page (about every 0.7 s while something changes)
  update(state) {
    if (!this.ready) return;
    const now = Date.now();
    const elapsed = this.lastTick ? Math.min(now - this.lastTick, 5000) : 0;
    this.lastTick = now;
    const key = state && state.title ? `${state.trackId || ""}\u0000${state.title}\u0000${state.artist}` : "";
    if (!key) return;
    // the same track started over (repeat): the position jumps from far in back to the start
    const restarted = this.track && this.track.key === key && this.track.scrobbled &&
      Number.isFinite(state.position) && state.position < 5 && this.track.lastPosition > 30;
    if (!this.track || this.track.key !== key || restarted) {
      // a new track (or the same one started over after it was scrobbled: repeat)
      this.track = {
        key,
        artist: state.scrobbleArtist || state.artist,
        title: state.title,
        album: state.album || "",
        duration: state.duration || 0,
        startedAt: Math.floor(now / 1000),
        played: 0,
        scrobbled: false,
        nowPlayingSent: false,
        lastPosition: 0,
      };
    }
    const t = this.track;
    if (Number.isFinite(state.position)) t.lastPosition = state.position;
    if (state.duration) t.duration = state.duration;
    if (state.playing) {
      t.played += elapsed;
      if (!t.nowPlayingSent) {
        t.nowPlayingSent = true;
        this.nowPlaying(t);
      }
    }
    const need = Math.min(t.duration * 500, 240000);
    if (!t.scrobbled && t.duration > 30 && t.played >= need) {
      t.scrobbled = true;
      this.scrobble(t);
    }
  }

  nowPlaying(t) {
    const params = { artist: t.artist, track: t.title, sk: this.session };
    if (t.album) params.album = t.album;
    if (t.duration) params.duration = String(Math.round(t.duration));
    this.call("track.updateNowPlaying", params).catch((e) => this.log.error("last.fm now playing", e.message));
  }

  scrobble(t) {
    const params = { artist: t.artist, track: t.title, timestamp: String(t.startedAt), sk: this.session };
    if (t.album) params.album = t.album;
    if (t.duration) params.duration = String(Math.round(t.duration));
    this.send(params);
  }

  async send(params) {
    try {
      await this.call("track.scrobble", params);
      this.log.info("last.fm scrobbled", params.artist, "—", params.track);
      // the connection works again: send what was waiting
      const waiting = this.queue.splice(0);
      for (const p of waiting) this.send(p);
    } catch (e) {
      this.log.error("last.fm scrobble", e.message);
      // network trouble (no Last.fm error code) or "service offline" / "temporarily unavailable": retry later
      if ((!e.code || e.code === 11 || e.code === 16) && this.queue.length < 200) this.queue.push(params);
    }
  }
}

module.exports = { LastFm };
