"use strict";
// Storage: sizes of downloaded tracks and caches, and moving the player data (downloaded tracks, caches,
// login) to another folder.
// Downloaded tracks live in the page's private file system ("File System" in the session data folder).
// Chromium refuses to write there through a junction, so the whole session data folder is moved instead:
// Electron's app.setPath("sessionData") points the browser profile to the new place before any window opens.
// The app's own files (config.json, logs, the mod) stay in %APPDATA%\YandexMusic.
const fs = require("fs");
const path = require("path");

const DOWNLOADS = "File System";
const CACHES = ["Cache", "Code Cache", "GPUCache", "DawnGraphiteCache", "DawnWebGPUCache"];
// Not session data: the app's own files (in the default place both share one folder) and per-launch files
// Chromium also writes next to the profile (Local State, DevToolsActivePort, lockfile); never copied either way
const NOT_SESSION = new Set(["modloader", "mods", "logs", "config.json", "Local State", "Crashpad", ".updaterId", "DevToolsActivePort", "Dictionaries", "lockfile"]);

const dirStats = async (dir) => {
  let bytes = 0, files = 0;
  const walk = async (d) => {
    let entries;
    try { entries = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile()) { try { bytes += (await fs.promises.stat(p)).size; files++; } catch {} }
    }
  };
  await walk(dir);
  return { bytes, files };
};

function countSync(p) {
  let bytes = 0, files = 0;
  const walk = (d) => {
    const st = fs.statSync(d);
    if (st.isFile()) { bytes += st.size; files++; return; }
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const q = path.join(d, e.name);
      if (e.isDirectory()) walk(q);
      else if (e.isFile()) { bytes += fs.statSync(q).size; files++; }
    }
  };
  if (fs.existsSync(p)) walk(p);
  return { bytes, files };
}

const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

const info = async (sessionDir, isCustom) => {
  const d = await dirStats(path.join(sessionDir, DOWNLOADS));
  let cacheBytes = 0;
  for (const c of CACHES) cacheBytes += (await dirStats(path.join(sessionDir, c))).bytes;
  return { downloadsBytes: d.bytes, downloadsFiles: d.files, downloadsDir: sessionDir, downloadsCustom: !!isCustom, cacheBytes };
};

// Moves the session data from `from` to `to` (both absolute). Runs before app "ready", nothing has the files open.
// Caches are not copied (they are rebuilt), everything else is copied, verified and only then removed at the source.
const moveSessionData = (from, to, userData, log) => {
  if (same(from, to)) return { ok: true, note: "already there" };
  const fromIsDefault = same(from, userData);
  const toIsDefault = same(to, userData);
  if (!toIsDefault && fs.existsSync(to) && fs.readdirSync(to).length) return { ok: false, error: "target folder is not empty" };
  const all = fs.existsSync(from) ? fs.readdirSync(from).filter((n) => !n.endsWith(".ymmods-old")) : [];
  // what is removed at the source afterwards: in the app folder only session entries, in a custom folder everything
  const entries = fromIsDefault ? all.filter((n) => !NOT_SESSION.has(n)) : all;
  const toCopy = all.filter((n) => !NOT_SESSION.has(n) && !CACHES.includes(n));
  // with the default place as the target, only its session entries must be free
  if (toIsDefault) {
    const clash = toCopy.find((n) => fs.existsSync(path.join(to, n)));
    if (clash) return { ok: false, error: `"${clash}" already exists in the app folder` };
  }
  const toExisted = fs.existsSync(to);
  const copied = [];
  try {
    fs.mkdirSync(to, { recursive: true });
    for (const name of toCopy) {
      const src = path.join(from, name), dst = path.join(to, name);
      const before = countSync(src);
      fs.cpSync(src, dst, { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true });
      copied.push(dst);
      const after = countSync(dst);
      if (after.files !== before.files || after.bytes !== before.bytes) throw new Error(`copy mismatch in "${name}"`);
    }
  } catch (e) {
    log.error("session data move failed, rolling back", e);
    // remove only what this move created
    for (const p of copied) { try { fs.rmSync(p, { recursive: true, force: true }); } catch {} }
    if (!toExisted && !toIsDefault) { try { fs.rmSync(to, { recursive: true, force: true }); } catch {} }
    return { ok: false, error: String(e.message || e) };
  }
  // the copy is verified: remove the source entries (caches included), and the old custom folder if it is empty now
  for (const name of entries) { try { fs.rmSync(path.join(from, name), { recursive: true, force: true }); } catch (e) { log.error("cleanup", name, e.message); } }
  if (!fromIsDefault) { try { if (!fs.readdirSync(from).length) fs.rmdirSync(from); } catch {} }
  log.info("session data moved", from, "->", to, `${toCopy.length} entries`);
  return { ok: true };
};

module.exports = { info, moveSessionData, DOWNLOADS };
