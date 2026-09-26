"use strict";
// Mod updates from GitHub releases (github.com/nersuga/ymusic_mod): the latest release carries
// YandexMusicMods-Setup-<version>.exe and its .sha256. The installer is downloaded, its hash checked
// against the .sha256 of the same release, and run silently; it closes the app, installs and (optionally) restarts it.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const REPO = "nersuga/ymusic_mod";
const API = `https://api.github.com/repos/${REPO}/releases/latest`;

const parse = (v) => String(v || "").replace(/^v/i, "").split(/[.+-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
const newer = (a, b) => {
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

class ModUpdater {
  constructor({ modHome, log }) {
    this.modHome = modHome;
    this.log = log;
    this.latest = null; // { version, notes, url, exe: {name, url, size}, sha: {url} }
    this.checkedAt = 0;
    this.error = "";
    this.downloaded = null; // path of a verified installer for this.latest.version
    this.busy = "";
  }

  get installed() {
    try { return fs.readFileSync(path.join(this.modHome, "version.txt"), "utf8").trim() || "0.0.0"; } catch { return "0.0.0"; }
  }

  get available() { return !!(this.latest && this.latest.exe && newer(this.latest.version, this.installed)); }

  status() {
    return {
      installed: this.installed,
      latest: this.latest ? this.latest.version : "",
      notes: this.latest ? this.latest.notes : "",
      page: this.latest ? this.latest.url : `https://github.com/${REPO}/releases`,
      available: this.available,
      checkedAt: this.checkedAt,
      error: this.error,
      busy: this.busy,
      ready: !!this.downloaded,
    };
  }

  async check() {
    try {
      const res = await fetch(API, { headers: { "User-Agent": "ymusic-mod-updater", Accept: "application/vnd.github+json" } });
      if (res.status === 404) throw new Error("no releases yet");
      if (!res.ok) throw new Error("GitHub: HTTP " + res.status);
      const rel = await res.json();
      const assets = rel.assets || [];
      const exe = assets.find((a) => /^YandexMusicMods-Setup-.*\.exe$/i.test(a.name));
      const sha = exe && assets.find((a) => a.name.toLowerCase() === (exe.name + ".sha256").toLowerCase());
      this.latest = {
        version: String(rel.tag_name || rel.name || "").replace(/^v/i, ""),
        notes: String(rel.body || "").slice(0, 2000),
        url: rel.html_url,
        exe: exe ? { name: exe.name, url: exe.browser_download_url, size: exe.size } : null,
        sha: sha ? { url: sha.browser_download_url } : null,
      };
      this.error = "";
      if (this.downloaded && !this.downloaded.includes(this.latest.version)) this.downloaded = null;
    } catch (e) {
      this.error = String(e.message || e);
      this.log.error("mod update check", this.error);
    }
    this.checkedAt = Date.now();
    return this.status();
  }

  // Release notes of the mod: the last releases (drafts skipped), cached for 10 minutes
  async changelog() {
    if (this.notes && Date.now() - this.notesAt < 600000) return this.notes;
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, { headers: { "User-Agent": "ymusic-mod-updater", Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error("GitHub: HTTP " + res.status);
    this.notes = (await res.json()).filter((r) => !r.draft).map((r) => ({
      version: String(r.tag_name || r.name || "").replace(/^v/i, ""),
      title: r.name && r.name !== r.tag_name ? String(r.name) : "",
      date: r.published_at || r.created_at || "",
      body: String(r.body || "").slice(0, 20000),
      prerelease: !!r.prerelease,
    }));
    this.notesAt = Date.now();
    return this.notes;
  }

  // Downloads the installer of the latest release and verifies it; returns its path.
  // onProgress({ stage: "download", percent } | { stage: "verify" })
  async download(onProgress = () => {}) {
    if (!this.available) throw new Error("no update");
    if (this.downloaded && fs.existsSync(this.downloaded)) return this.downloaded;
    if (!this.latest.sha) throw new Error("the release has no .sha256 file");
    this.busy = "download";
    try {
      const get = async (url) => {
        const res = await fetch(url, { headers: { "User-Agent": "ymusic-mod-updater" } });
        if (!res.ok) throw new Error("download: HTTP " + res.status);
        return Buffer.from(await res.arrayBuffer());
      };
      const expected = (await get(this.latest.sha.url)).toString("utf8").trim().split(/\s+/)[0].toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(expected)) throw new Error("bad .sha256 file");
      // streamed, to report the progress
      const res = await fetch(this.latest.exe.url, { headers: { "User-Agent": "ymusic-mod-updater" } });
      if (!res.ok || !res.body) throw new Error("download: HTTP " + res.status);
      const total = Number(res.headers.get("content-length")) || this.latest.exe.size || 0;
      const parts = [];
      let got = 0, lastPercent = -1;
      for await (const chunk of res.body) {
        parts.push(Buffer.from(chunk));
        got += chunk.length;
        const percent = total ? Math.min(100, Math.floor((got / total) * 100)) : 0;
        if (percent !== lastPercent) { lastPercent = percent; onProgress({ stage: "download", percent }); }
      }
      const body = Buffer.concat(parts);
      onProgress({ stage: "verify" });
      const actual = crypto.createHash("sha256").update(body).digest("hex");
      if (actual !== expected) throw new Error("the installer does not match its SHA-256");
      const dir = path.join(os.tmpdir(), "ymmods-update");
      fs.mkdirSync(dir, { recursive: true });
      for (const f of fs.readdirSync(dir)) { try { fs.unlinkSync(path.join(dir, f)); } catch {} }
      const file = path.join(dir, this.latest.exe.name);
      fs.writeFileSync(file, body);
      this.downloaded = file;
      this.log.info("mod update downloaded and verified", file, actual);
      return file;
    } finally {
      this.busy = "";
    }
  }
}

module.exports = { ModUpdater, newer };
