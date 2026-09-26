"use strict";
// Taskbar thumbnail toolbar (the buttons under the window preview on Windows): previous / play-pause / next.
// nativeImage cannot read SVG, so the three icons are rasterized here into small PNGs.
const zlib = require("zlib");
const { nativeImage } = require("electron");

// ── Tiny PNG encoder (RGBA, no filtering) ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const encodePng = (size, alpha) => {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = raw[o + 1] = raw[o + 2] = 255;
      raw[o + 3] = alpha[y * size + x];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};

// ── Rasterizer: polygons in a 16×16 design grid, 4×4 supersampling for smooth edges ──
const inside = (poly, x, y) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const draw = (polys, size) => {
  const alpha = new Uint8Array(size * size);
  const k = 16 / size, S = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let n = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const x = (px + (sx + 0.5) / S) * k, y = (py + (sy + 0.5) / S) * k;
        if (polys.some((p) => inside(p, x, y))) n++;
      }
      alpha[py * size + px] = Math.round((n / (S * S)) * 255);
    }
  }
  return alpha;
};
const SHAPES = {
  play: [[[5, 3], [13, 8], [5, 13]]],
  pause: [rect(4, 3, 3, 10), rect(9, 3, 3, 10)],
  prev: [rect(3, 3, 2, 10), [[13, 3], [13, 13], [5.5, 8]]],
  next: [rect(11, 3, 2, 10), [[3, 3], [10.5, 8], [3, 13]]],
};
let icons = null;
const getIcons = () => {
  if (icons) return icons;
  icons = {};
  for (const [name, polys] of Object.entries(SHAPES)) {
    const img = nativeImage.createEmpty();
    // 1x, 1.5x and 2x representations: Windows picks the one that matches the display scale
    for (const scale of [1, 1.5, 2]) {
      const size = Math.round(16 * scale);
      img.addRepresentation({ scaleFactor: scale, width: size, height: size, buffer: encodePng(size, draw(polys, size)) });
    }
    icons[name] = img;
  }
  return icons;
};

const TEXT = {
  ru: { prev: "Предыдущий трек", next: "Следующий трек", play: "Воспроизвести", pause: "Пауза" },
  en: { prev: "Previous track", next: "Next track", play: "Play", pause: "Pause" },
  kk: { prev: "Алдыңғы трек", next: "Келесі трек", play: "Ойнату", pause: "Кідірту" },
  uz: { prev: "Oldingi trek", next: "Keyingi trek", play: "Ijro etish", pause: "Pauza" },
};

// update(win, { enabled, playing, lang, cmd }) — sets or clears the buttons
const update = (win, { enabled, playing, lang, cmd }) => {
  if (process.platform !== "win32" || !win || win.isDestroyed()) return;
  try {
    if (!enabled) { win.setThumbarButtons([]); return; }
    const t = TEXT[(lang || "").slice(0, 2)] || TEXT.ru;
    const i = getIcons();
    win.setThumbarButtons([
      { tooltip: t.prev, icon: i.prev, click: () => cmd("prev") },
      { tooltip: playing ? t.pause : t.play, icon: playing ? i.pause : i.play, click: () => cmd("playPause") },
      { tooltip: t.next, icon: i.next, click: () => cmd("next") },
    ]);
  } catch {}
};

module.exports = { update, encodePng, draw, SHAPES };
