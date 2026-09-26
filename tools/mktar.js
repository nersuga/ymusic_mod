"use strict";
// Writes a .tar.gz with Unix permissions from Windows (tar.exe cannot set the executable bit).
//   node tools/mktar.js <out.tar.gz> <root name in the archive> <list.json>
// list.json: [{ "src": "path on disk", "dst": "path inside root", "mode": "755" (optional, default 644) }]
// Scripts (.sh) and text files get LF line endings, whatever git checked out.
const fs = require("fs");
const zlib = require("zlib");

const [out, root, listFile] = process.argv.slice(2);
const list = JSON.parse(fs.readFileSync(listFile, "utf8"));
const TEXT = /\.(sh|js|css|html|json|md|txt)$/i;
const mtime = Math.floor(Date.now() / 1000);

const header = (name, size, mode, type) => {
  const h = Buffer.alloc(512);
  const nameBuf = Buffer.from(name, "utf8");
  if (nameBuf.length > 100) throw new Error("name too long for ustar: " + name);
  nameBuf.copy(h, 0);
  const octal = (n, len) => n.toString(8).padStart(len - 1, "0") + "\0";
  h.write(octal(parseInt(mode, 8), 8), 100);
  h.write(octal(0, 8), 108); // uid
  h.write(octal(0, 8), 116); // gid
  h.write(octal(size, 12), 124);
  h.write(octal(mtime, 12), 136);
  h.write("        ", 148); // checksum placeholder
  h.write(type, 156);
  h.write("ustar\0", 257);
  h.write("00", 263);
  let sum = 0;
  for (const b of h) sum += b;
  h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
  return h;
};

const parts = [];
const dirs = new Set();
const addDir = (dir) => {
  if (!dir || dirs.has(dir)) return;
  addDir(dir.split("/").slice(0, -1).join("/"));
  dirs.add(dir);
  parts.push(header(dir + "/", 0, "755", "5"));
};
for (const item of list) {
  let data = fs.readFileSync(item.src);
  if (TEXT.test(item.dst)) data = Buffer.from(data.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  const name = `${root}/${item.dst}`;
  addDir(name.split("/").slice(0, -1).join("/"));
  parts.push(header(name, data.length, item.mode || "644", "0"), data, Buffer.alloc((512 - (data.length % 512)) % 512));
}
parts.push(Buffer.alloc(1024));
fs.writeFileSync(out, zlib.gzipSync(Buffer.concat(parts), { level: 9 }));
console.log("wrote", out);
