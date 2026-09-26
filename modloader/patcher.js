"use strict";
// Yandex Music mod patcher. Works in plain Node and in the app's own exe with ELECTRON_RUN_AS_NODE=1.
//   node patcher.js --app-dir <dir> [--out result.json] [--force | --restore]
// Builds resources/app.asar.ymmods-new from the ORIGINAL app.asar:
//   - package.json "main" -> ymmods-boot.js (loads modloader/main.js, then the app's index.js)
//   - optional wheel patches in the renderer chunk (skipped as a whole if the code changed)
// It does not touch the installed files: watch-update.ps1 swaps the asar and writes the new integrity
// hash into the exe (at result.offset) once the exe is no longer running.
process.noAsar = true;
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const APP_DIR = arg("--app-dir");
const OUT = arg("--out");
const FORCE = args.includes("--force");
const RESTORE = args.includes("--restore"); // uninstall: put the original asar of this version back
const MOD_HOME = __dirname;
const BACKUP_DIR = path.join(MOD_HOME, "backup");
const BOOT_NAME = "ymmods-boot.js";
const PATCHER_VERSION = 2;

const result = { ok: false, status: "", version: "", offset: -1, oldHash: "", newHash: "", wheelPatched: false, notes: [] };
const finish = () => {
  const text = JSON.stringify(result, null, 2);
  if (OUT) fs.writeFileSync(OUT, text); else console.log(text);
};

// ── Minimal asar reader/writer ────────────────────────────────────────────
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const readAsar = (file) => {
  const buf = fs.readFileSync(file);
  const headerSize = buf.readUInt32LE(4);
  const jsonLen = buf.readUInt32LE(12);
  const headerString = buf.toString("utf8", 16, 16 + jsonLen);
  return { buf, headerString, header: JSON.parse(headerString), dataOffset: 8 + headerSize };
};
const BLOCK = 4 * 1024 * 1024;
const integrityOf = (content) => {
  const blocks = [];
  for (let i = 0; i < content.length; i += BLOCK) blocks.push(sha256(content.subarray(i, i + BLOCK)));
  if (!blocks.length) blocks.push(sha256(Buffer.alloc(0)));
  return { algorithm: "SHA256", hash: sha256(content), blockSize: BLOCK, blocks };
};
// replacements: Map<"dir/file", Buffer>; files not present in the header are added at the root
const writeAsar = (src, replacements, outFile) => {
  const header = JSON.parse(src.headerString);
  const chunks = [];
  let offset = 0;
  const walk = (node, prefix) => {
    for (const [name, entry] of Object.entries(node.files)) {
      const rel = prefix ? `${prefix}/${name}` : name;
      if (entry.files) { walk(entry, rel); continue; }
      if (entry.unpacked || entry.link) continue;
      let content = replacements.get(rel);
      if (content) {
        replacements.delete(rel);
        entry.size = content.length;
        entry.integrity = integrityOf(content);
      } else {
        const start = src.dataOffset + Number(entry.offset);
        content = src.buf.subarray(start, start + entry.size);
      }
      entry.offset = String(offset);
      offset += content.length;
      chunks.push(content);
    }
  };
  walk(header, "");
  for (const [rel, content] of replacements) {
    if (rel.includes("/")) throw new Error("cannot add nested file " + rel);
    header.files[rel] = { size: content.length, offset: String(offset), integrity: integrityOf(content) };
    offset += content.length;
    chunks.push(content);
  }
  const headerString = JSON.stringify(header);
  const strBuf = Buffer.from(headerString, "utf8");
  const pad = (4 - (strBuf.length % 4)) % 4;
  const headerPickle = Buffer.alloc(8 + strBuf.length + pad);
  headerPickle.writeUInt32LE(4 + strBuf.length + pad, 0);
  headerPickle.writeUInt32LE(strBuf.length, 4);
  strBuf.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4, 0);
  sizePickle.writeUInt32LE(headerPickle.length, 4);
  const fd = fs.openSync(outFile, "w");
  try {
    fs.writeSync(fd, sizePickle);
    fs.writeSync(fd, headerPickle);
    for (const c of chunks) fs.writeSync(fd, c);
  } finally { fs.closeSync(fd); }
  return headerString;
};
const readFileFromAsar = (asar, rel) => {
  let node = asar.header;
  for (const part of rel.split("/")) { node = node.files && node.files[part]; if (!node) return null; }
  if (node.files) return null;
  const start = asar.dataOffset + Number(node.offset);
  return asar.buf.subarray(start, start + node.size);
};
const listFiles = (asar, dir) => {
  let node = asar.header;
  for (const part of dir.split("/")) { node = node.files && node.files[part]; if (!node) return []; }
  return Object.keys(node.files || {}).map((n) => `${dir}/${n}`);
};

// ── Wheel patches (renderer chunk), shared with the Linux on-the-fly patching in main.js ──
const { isWheelChunk, patchWheelChunk } = require("./wheelpatch");

const bootSource = () => `"use strict";
// Yandex Music mod bootstrap (patcher v${PATCHER_VERSION}): loads the external mod, then the app itself.
// If the mod folder is gone the app starts unmodified.
try {
  const main = require("path").join(process.env.APPDATA || "", "YandexMusic", "modloader", "main.js");
  if (require("fs").existsSync(main)) require(main)({ appRequire: require, appDir: __dirname });
} catch (e) {
  console.error("[ymmods] boot failed", e);
}
require("./index.js");
`;

try {
  if (!APP_DIR) throw new Error("--app-dir is required");
  const asarPath = path.join(APP_DIR, "resources", "app.asar");
  const exePath = fs.readdirSync(APP_DIR).filter((f) => /\.exe$/i.test(f) && !/^uninstall|elevate/i.test(f))
    .map((f) => path.join(APP_DIR, f)).sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

  const installed = readAsar(asarPath);
  const installedPkg = JSON.parse(readFileFromAsar(installed, "package.json").toString("utf8"));
  result.version = installedPkg.version;
  result.oldHash = sha256(installed.headerString);
  const alreadyPatched = installedPkg.main === BOOT_NAME;
  const exeOffset = (newHash) => {
    // Where the exe keeps the expected hash (asar integrity). -1: integrity not embedded, nothing to write
    const exe = fs.readFileSync(exePath);
    result.offset = exe.indexOf(Buffer.from(result.oldHash, "ascii"));
    if (result.offset >= 0 && exe.indexOf(Buffer.from(result.oldHash, "ascii"), result.offset + 1) >= 0) throw new Error("hash found twice in exe");
    result.newHash = newHash;
    result.exe = exePath;
  };
  if (RESTORE) {
    if (!alreadyPatched) {
      result.ok = true;
      result.status = "not-patched";
      finish();
      process.exit(0);
    }
    const backupPath = path.join(BACKUP_DIR, `app-${installedPkg.version}.asar`);
    if (!fs.existsSync(backupPath)) throw new Error("no original backup for " + installedPkg.version + ": reinstall Yandex Music to remove the mod");
    const original = readAsar(backupPath);
    if (JSON.parse(readFileFromAsar(original, "package.json").toString("utf8")).main === BOOT_NAME) throw new Error("backup is not an original asar");
    const newPath = asarPath + ".ymmods-new";
    fs.copyFileSync(backupPath, newPath);
    exeOffset(sha256(original.headerString));
    result.newAsar = newPath;
    result.ok = true;
    result.status = "restored";
    finish();
    process.exit(0);
  }
  const installedBoot = alreadyPatched ? String(readFileFromAsar(installed, BOOT_NAME) || "") : "";
  if (alreadyPatched && !FORCE && installedBoot.includes(`patcher v${PATCHER_VERSION}`)) {
    result.ok = true;
    result.status = "already-patched";
    finish();
    process.exit(0);
  }

  // Original asar of this version: backup if we have one, otherwise the installed file (fresh install/update)
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(BACKUP_DIR, `app-${installedPkg.version}.asar`);
  if (!fs.existsSync(backupPath)) {
    if (alreadyPatched) throw new Error("installed asar is patched but no original backup for " + installedPkg.version);
    fs.copyFileSync(asarPath, backupPath);
    result.notes.push("backup created " + path.basename(backupPath));
  }
  // Keep only the backup of the current version
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    if (/^app-.*\.asar$/.test(f) && f !== path.basename(backupPath)) fs.unlinkSync(path.join(BACKUP_DIR, f));
  }
  const original = readAsar(backupPath);
  const originalPkg = JSON.parse(readFileFromAsar(original, "package.json").toString("utf8"));
  if (originalPkg.main === BOOT_NAME) throw new Error("backup is not an original asar");

  const replacements = new Map();
  const pkg = { ...originalPkg, main: BOOT_NAME, ymmodsOriginalMain: originalPkg.main };
  replacements.set("package.json", Buffer.from(JSON.stringify(pkg, null, 2)));
  replacements.set(BOOT_NAME, Buffer.from(bootSource()));

  for (const rel of listFiles(original, "app/_next/static/chunks").filter((f) => f.endsWith(".js"))) {
    const code = readFileFromAsar(original, rel).toString("utf8");
    if (!isWheelChunk(code)) continue;
    const patched = patchWheelChunk(code);
    if (patched) { replacements.set(rel, Buffer.from(patched)); result.wheelPatched = true; }
    else result.notes.push("wheel chunk found but patterns changed: " + rel + " (wheel stays native)");
  }
  if (!result.wheelPatched && !result.notes.some((n) => n.startsWith("wheel"))) result.notes.push("wheel chunk not found (wheel stays native)");

  const newPath = asarPath + ".ymmods-new";
  const newHeader = writeAsar(original, replacements, newPath);
  exeOffset(sha256(newHeader));
  result.newAsar = newPath;
  result.ok = true;
  result.status = "patched";
} catch (e) {
  result.status = "error";
  result.notes.push(String(e && e.stack || e));
}
finish();
process.exit(result.ok ? 0 : 1);
