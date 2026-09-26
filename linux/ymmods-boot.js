"use strict";
// ymusic_mod boot for Linux (boot v1). install.sh puts it into <app>/resources/app/ next to a package.json whose
// "main" points here. Electron loads resources/app before resources/app.asar (the OnlyLoadAppFromAsar fuse is off
// in the Linux build), so the app itself stays untouched and its updates don't remove the mod.
// It loads the mod from the user's config folder, then the real app from app.asar. Without the mod folder the
// app starts unmodified.
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { app } = require("electron");

const asarDir = path.join(process.resourcesPath, "app.asar");
let pkg = {};
try { pkg = JSON.parse(fs.readFileSync(path.join(asarDir, "package.json"), "utf8")); } catch {}

// The app looks for its pages next to app.getAppPath() and reports app.getVersion(): both must describe app.asar,
// not this folder (its package.json keeps the version the mod was installed with)
const bootVersion = app.getVersion();
app.getAppPath = () => asarDir;
if (pkg.version && pkg.version !== bootVersion) {
  app.getVersion = () => pkg.version;
  try { app.userAgentFallback = app.userAgentFallback.split(`/${bootVersion} `).join(`/${pkg.version} `); } catch {}
}

global.__ymmodsBoot = { version: 1, platform: "linux", dir: __dirname };
try {
  const main = path.join(app.getPath("appData"), "YandexMusic", "modloader", "main.js");
  if (fs.existsSync(main)) {
    const appRequire = Module.createRequire(path.join(asarDir, "index.js"));
    require(main)({ appRequire, appDir: asarDir });
  }
} catch (e) {
  console.error("[ymmods] boot failed", e);
}
require(path.join(asarDir, pkg.main || "index.js"));
