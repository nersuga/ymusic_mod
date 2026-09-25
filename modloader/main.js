"use strict";
// Yandex Music mod — main process part.
// Loaded by ymmods-boot.js (inside app.asar) before the app's own index.js. Uses only public Electron APIs
// and IPC channel names, so it keeps working across app updates; the patcher re-installs the boot file.
const electron = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");

const { app, ipcMain, session, shell, webFrameMain, Tray, MenuItem, BrowserWindow, dialog, globalShortcut, screen } = electron;
const MOD_HOME = __dirname;
const APP_URL_PREFIX = "music-application://";

module.exports = ({ appRequire, appDir } = {}) => {
  let logger = console;
  try { logger = appRequire("electron-log"); } catch {}
  const log = {
    info: (...args) => logger.info("[mods]", ...args),
    error: (...args) => logger.error("[mods]", ...args),
  };

  const modsDir = path.join(app.getPath("userData"), "mods");
  const configFile = path.join(modsDir, "config.json");
  try { fs.mkdirSync(modsDir, { recursive: true }); } catch {}

  // ── Config ───────────────────────────────────────────────────────────────
  const DEFAULTS = {
    disableUpdates: true,
    trayUnloadWhenPaused: true,
    trayUnloadDelaySec: 30,
    trayTrimWhenPlaying: true,
    trayTrimDelaySec: 15,
    trayTrimIntervalMin: 10,
    wheelFilter: false,
    wheelNoLoop: true,
    wheelShowSettingsTile: true,
    wheelSettingItem: null,
    hideWordsCard: false,
    blockMetrics: true,
    wheelKeep: [],
    wheelKnown: {},
    wheelItems: {},
    showVolumePercent: true,
    theme: "default", // default | amoled | glass | contrast
    vibeAnimation: "on", // on | focus (only while the window is focused) | off
    hideConcerts: false,
    hideNonMusic: false,
    hidePlusPromo: false,
    blockAds: true,
    hotkeysEnabled: true,
    hotkeys: {
      playPause: "Ctrl+Alt+P",
      next: "Ctrl+Alt+Right",
      prev: "Ctrl+Alt+Left",
      like: "Ctrl+Alt+L",
      volumeUp: "Ctrl+Alt+Up",
      volumeDown: "Ctrl+Alt+Down",
      miniPlayer: "Ctrl+Alt+M",
    },
    miniPlayerBounds: null,
  };
  const config = () => {
    try {
      const file = JSON.parse(fs.readFileSync(configFile, "utf8").replace(/^﻿/, ""));
      // hotkeys are merged per action so a partial object keeps the other defaults
      return { ...DEFAULTS, ...file, hotkeys: { ...DEFAULTS.hotkeys, ...(file.hotkeys && typeof file.hotkeys === "object" ? file.hotkeys : {}) } };
    } catch (e) {
      if (e.code === "ENOENT") {
        try { fs.writeFileSync(configFile, JSON.stringify(DEFAULTS, null, 2)); } catch {}
        return { ...DEFAULTS };
      }
      log.error("config.json is invalid, using defaults (file left untouched)", e.message);
      // Non-enumerable marker: never write these defaults over the user's broken file
      return Object.defineProperty({ ...DEFAULTS }, "__invalid", { value: true });
    }
  };
  const saveConfig = (cfg) => {
    if (cfg.__invalid) throw new Error("config.json is invalid, not overwriting");
    fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
  };

  const isAppUrl = (url) => typeof url === "string" && url.startsWith(APP_URL_PREFIX);
  const isAppContents = (wc) => wc && !wc.isDestroyed() && isAppUrl(wc.getURL());

  // ── Updates: skip checks while disabled; when enabled, re-patch after install ──
  let watcherStarted = false;
  const startUpdateWatcher = () => {
    if (watcherStarted) return;
    watcherStarted = true;
    const script = path.join(MOD_HOME, "watch-update.ps1");
    const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${script}" ` +
      `-Mode update -AppDir "${path.dirname(process.execPath)}" -WaitPid ${process.pid}`;
    // A plain child dies together with the quitting app (its process tree/job), so the watcher is created
    // through WMI: it gets its own console and is not tied to this process at all
    const launcher = "$si = ([wmiclass]'Win32_ProcessStartup').CreateInstance(); $si.ShowWindow = 0; " +
      `$r = ([wmiclass]'Win32_Process').Create('${command.replace(/'/g, "''")}', '${os.tmpdir().replace(/'/g, "''")}', $si); exit $r.ReturnValue`;
    const r = childProcess.spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", launcher], { windowsHide: true, timeout: 20000 });
    log.info("update watcher started", script, "result", r.status);
  };
  const setupUpdater = () => {
    let updater;
    try { updater = appRequire("electron-updater").autoUpdater; } catch (e) { return log.error("electron-updater not found", e); }
    const originalCheck = updater.checkForUpdates.bind(updater);
    updater.checkForUpdates = (...args) => {
      if (config().disableUpdates) {
        log.info("update check skipped (disableUpdates)");
        return Promise.resolve(null);
      }
      return originalCheck(...args);
    };
    // The watcher relaunches the app after re-patching; the installer must not start it unpatched
    try { Object.defineProperty(updater, "autoRunAppAfterInstall", { get: () => false, set: () => {}, configurable: true }); } catch {}
    let downloaded = false;
    updater.on("update-downloaded", () => { downloaded = true; });
    updater.on("before-quit-for-update", startUpdateWatcher);
    app.on("will-quit", () => { if (downloaded) startUpdateWatcher(); });
  };

  // ── Player state (the app's own IPC channel) ─────────────────────────────
  let isPlaying = false;
  ipcMain.on("desktop:player:state", (_event, playerState) => {
    if (playerState && typeof playerState.isPlaying === "boolean") isPlaying = playerState.isPlaying;
  });

  // ── Tray: unload UI while paused, trim memory while playing ─────────────
  const trimMemory = () => {
    if (process.platform !== "win32") return;
    const pids = app.getAppMetrics().map((m) => m.pid).filter(Number.isInteger);
    if (!pids.length) return;
    const script = "Add-Type -Name W -Namespace P -MemberDefinition '[DllImport(\"psapi.dll\")] public static extern bool EmptyWorkingSet(IntPtr h);';" +
      "foreach($i in @(" + pids.join(",") + ")){ try { [void][P.W]::EmptyWorkingSet((Get-Process -Id $i).Handle) } catch {} }";
    childProcess.execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true }, () => {});
    log.info("trimmed working set", pids.join(","));
  };
  let restoreUi = null; // set for the main window: (after) => boolean
  let mainWin = null;
  const setupTray = (win) => {
    const wc = win.webContents;
    let hiddenAt = 0;
    let pausedSince = 0;
    let lastTrim = 0;
    let unloadedUrl = null;
    const restore = (after) => {
      if (!unloadedUrl) return false;
      const url = unloadedUrl;
      unloadedUrl = null;
      log.info("restoring UI", url);
      if (after) wc.once("did-finish-load", () => setTimeout(after, 4000));
      wc.loadURL(url).catch((e) => log.error("restore failed", e));
      return true;
    };
    restoreUi = restore;
    mainWin = win;
    win.on("hide", () => { hiddenAt = Date.now(); lastTrim = 0; });
    win.on("show", () => { hiddenAt = 0; restore(); });
    const timer = setInterval(() => {
      if (win.isDestroyed()) return clearInterval(timer);
      if (!hiddenAt || unloadedUrl) { pausedSince = 0; return; }
      const cfg = config();
      const now = Date.now();
      if (isPlaying) {
        pausedSince = 0;
        const due = lastTrim ? now - lastTrim >= cfg.trayTrimIntervalMin * 60000 : now - hiddenAt >= cfg.trayTrimDelaySec * 1000;
        if (cfg.trayTrimWhenPlaying && due) { lastTrim = now; trimMemory(); }
        return;
      }
      pausedSince ||= now;
      if (cfg.trayUnloadWhenPaused && now - pausedSince >= cfg.trayUnloadDelaySec * 1000 && isAppContents(wc)) {
        unloadedUrl = wc.getURL();
        log.info("unloading UI while hidden", unloadedUrl);
        wc.loadURL("about:blank").then(() => setTimeout(trimMemory, 3000)).catch((e) => log.error("unload failed", e));
      }
    }, 5000);
  };
  // Tray menu (hooked where the app hands it to the tray): player buttons — the group between the first
  // two separators — reload an unloaded UI first; mini player and sleep timer items are added after them
  const augmentTrayMenu = (menu) => {
    const items = menu.items;
    const separators = items.map((item, i) => (item.type === "separator" ? i : -1)).filter((i) => i >= 0);
    if (separators.length < 2) return;
    for (let i = separators[0] + 1; i < separators[1]; i++) {
      const item = items[i];
      if (typeof item.click !== "function") continue;
      const click = item.click;
      item.click = function (...args) { if (!(restoreUi && restoreUi(() => click.apply(this, args)))) click.apply(this, args); };
    }
    let at = separators[1];
    for (const extra of trayExtraItems()) menu.insert(at++, new MenuItem(extra));
  };
  const originalSetContextMenu = Tray.prototype.setContextMenu;
  Tray.prototype.setContextMenu = function (menu) {
    try { if (menu) augmentTrayMenu(menu); } catch (e) { log.error("tray menu", e); }
    return originalSetContextMenu.call(this, menu);
  };

  // ── Mods folder: CSS/JS injection, hot reload, hotkeys ───────────────────
  const listMods = (ext) => {
    try { return fs.readdirSync(modsDir).filter((f) => f.endsWith(ext) && !f.startsWith("_")).sort(); } catch { return []; }
  };
  const readMod = (f) => fs.readFileSync(path.join(modsDir, f), "utf8");
  const BUILTIN_CSS =
    // Few wheel tiles: the swiper wrapper would spread them over the full height
    '[data-test-id="WHEEL_DESKTOP"] .swiper-wrapper{justify-content:flex-start!important}' +
    '[data-test-id="WHEEL_DESKTOP"][data-ym-fit] .swiper-wrapper{justify-content:center!important;transform:none!important}' +
    // Vibe page content root (overflow:hidden) starts below the title bar and before the right edge: it cuts the vibe canvas
    '[class*="Content_root_newVibe"]{margin-top:calc(-12px - 20px)!important;padding-top:20px!important;margin-right:-12px!important;padding-right:12px!important}';
  // Themes override the app's own colour variables (defined on .ym-dark-theme; doubled class = higher priority)
  const THEME_CSS = {
    amoled: ".ym-dark-theme.ym-dark-theme{--ym-background-color-primary-enabled-content:#000;--ym-background-color-primary-enabled-player:#000;" +
      "--ym-background-color-primary-enabled-popover:#0b0b0b;--ym-background-color-primary-enabled-menu:rgba(8,8,8,.92);" +
      "--ym-background-color-primary-enabled-vibe:#000;--ym-background-color-primary-enabled-header:rgba(0,0,0,.7);--ym-background-color-secondary-enabled-blur:#161616}" +
      "body{background:#000!important}" +
      // My Vibe start screen paints its own track-coloured gradient on the layout root
      "[class*='DefaultLayout_rootNewVibe']{background:#000!important}",
    glass: ".ym-dark-theme.ym-dark-theme{--ym-background-color-primary-enabled-content:rgba(16,16,16,.55);--ym-background-color-primary-enabled-player:rgba(18,18,18,.5);" +
      "--ym-background-color-primary-enabled-popover:rgba(26,26,26,.6);--ym-background-color-primary-enabled-menu:rgba(26,26,26,.55);" +
      "--ym-background-color-primary-enabled-basic:transparent}" +
      // blurred cover of the current track behind the whole app
      // (body must be transparent: its own background is painted above a z-index:-1 layer)
      // the blurred cover itself: two cross-fading layers created by features.js
      ".ymmods-cover-layer{display:block!important}" +
      "html{background:#000!important}body{background:transparent!important}" +
      // My Vibe start screen: its own gradient on the layout root would hide the blurred cover
      "[class*='DefaultLayout_rootNewVibe']{background:transparent!important}" +
      // only the bar itself (its controls block also carries PlayerBarDesktop*/_root classes)
      "section[class*='PlayerBarDesktop']{background:rgba(18,18,18,.5)!important;backdrop-filter:blur(30px) saturate(150%)}" +
      // played part of the track lightens the whole bar background: too loud on glass
      "[class*='ChangeTimecodeBackground_backgroundProgressbar']::before{background-color:rgba(255,255,255,.07)!important}" +
      // real popups only: a blur on a button inside a glass panel shows up as a dark blob
      "[role=menu]:not(button),[role=dialog]:not(button){backdrop-filter:blur(30px) saturate(150%)}" +
      // sticky page headers stack their own translucent layer on the content's one: a dark strip
      "[class*='StickyHeader_container']{background:transparent!important;backdrop-filter:blur(24px) saturate(140%)}",
    contrast: ".ym-dark-theme.ym-dark-theme{--ym-controls-color-primary-text-enabled:hsla(0,0%,100%,.82);--ym-controls-color-secondary-text-enabled:hsla(0,0%,100%,.8);" +
      "--ym-controls-color-primary-text-disabled:#8a8a8a;--ym-controls-color-secondary-outline-enabled_stroke:#8a8a8a;--ym-controls-color-primary-outline-enabled:#666;" +
      "--ym-outline-color-primary-disabled:hsla(0,0%,100%,.14)}",
  };
  const featureCssKeys = new WeakMap();
  const applyFeatureCss = (wc) => {
    if (!isAppContents(wc)) return;
    const cfg = config();
    let css = "";
    if (cfg.hideWordsCard) css += '[data-test-id="WORDS_CARD"]{display:none!important}';
    if (cfg.hideConcerts) css += '[data-test-id="NAVBAR_NAVIGATION_ITEM_CONCERTS"]{display:none!important}';
    if (cfg.hideNonMusic) css += '[data-test-id="NAVBAR_NAVIGATION_ITEM_NON_MUSIC"]{display:none!important}';
    if (cfg.hidePlusPromo) css += '[data-test-id="USER_PROFILE_PLUS_BADGE"],[data-test-id="USER_PROFILE_PLUS_LINK"],[class*="WithTopBanner_banner"],[class*="PlusOffer"],[class*="plusOffer"]{display:none!important}';
    if (THEME_CSS[cfg.theme]) css += THEME_CSS[cfg.theme];
    wc.executeJavaScript(`document.documentElement.toggleAttribute("data-ym-no-volume-percent", ${!cfg.showVolumePercent});` +
      `document.documentElement.setAttribute("data-ym-anim", ${JSON.stringify(cfg.vibeAnimation)})`).catch(() => {});
    const prev = featureCssKeys.get(wc);
    if (prev) wc.removeInsertedCSS(prev).catch(() => {});
    featureCssKeys.delete(wc);
    if (css) wc.insertCSS(css).then((key) => featureCssKeys.set(wc, key)).catch(() => {});
  };
  const appContents = new Set();
  const modCssKeys = new WeakMap();
  const injectModCss = async (wc) => {
    if (!isAppContents(wc)) return;
    for (const key of modCssKeys.get(wc) || []) wc.removeInsertedCSS(key).catch(() => {});
    const keys = [];
    for (const f of listMods(".css")) {
      try { keys.push(await wc.insertCSS(readMod(f))); } catch (e) { log.error("css", f, e); }
    }
    modCssKeys.set(wc, keys);
  };
  let cssTimer;
  try {
    fs.watch(modsDir, () => {
      clearTimeout(cssTimer);
      cssTimer = setTimeout(() => appContents.forEach((wc) => (wc.isDestroyed() ? appContents.delete(wc) : injectModCss(wc))), 150);
    });
  } catch {}
  const setupInjection = (win) => {
    const wc = win.webContents;
    wc.on("dom-ready", () => {
      if (!isAppContents(wc)) return;
      appContents.add(wc);
      wc.insertCSS(BUILTIN_CSS).catch(() => {});
      applyFeatureCss(wc);
      injectModCss(wc);
      for (const f of listMods(".js")) {
        wc.executeJavaScript(readMod(f) + "\n//# sourceURL=mods/" + f).catch((e) => log.error("js", f, e));
      }
      for (const file of ["features.js", "settings-ui.js"]) {
        try {
          wc.executeJavaScript(fs.readFileSync(path.join(MOD_HOME, file), "utf8") + "\n//# sourceURL=ymmods/" + file)
            .catch((e) => log.error(file, e));
        } catch (e) { log.error(file, e); }
      }
    });
    // Lets CSS mods tell a maximized window apart (restore icon in window-buttons.css)
    const markMaximized = () => {
      if (!win.isDestroyed() && isAppContents(wc)) {
        wc.executeJavaScript(`document.documentElement.toggleAttribute("data-ym-maximized", ${win.isMaximized()})`).catch(() => {});
      }
    };
    win.on("maximize", markMaximized);
    win.on("unmaximize", markMaximized);
    wc.on("dom-ready", markMaximized);
    wc.on("before-input-event", (event, input) => {
      if (input.type !== "keyDown") return;
      if (input.key === "F12") { wc.toggleDevTools(); event.preventDefault(); }
      else if (input.key === "F5") { wc.reload(); event.preventDefault(); }
    });
  };

  // ── IPC for the settings UI ──────────────────────────────────────────────
  const own = (event) => isAppContents(event.sender);
  const isModFile = (name) => typeof name === "string" && name === path.basename(name) && /\.(css|js)$/.test(name);
  ipcMain.on("ymmods:flags", (event) => {
    try { event.returnValue = { wheelNoLoop: !!config().wheelNoLoop }; } catch { event.returnValue = {}; }
  });
  ipcMain.handle("ymmods:get", (event) => {
    if (!own(event)) return null;
    let files = [];
    try { files = fs.readdirSync(modsDir).filter(isModFile).sort((a, b) => a.replace(/^_/, "").localeCompare(b.replace(/^_/, ""))); } catch {}
    return { config: config(), mods: files.map((name) => ({ name, enabled: !name.startsWith("_") })), hotkeyStatus, sleep: sleepInfo() };
  });
  const applyConfigPatch = (cfg, patch) => {
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in cfg) || typeof cfg[key] !== typeof value) continue;
      if (key === "hotkeys") {
        if (!value || Array.isArray(value)) continue;
        const hotkeys = { ...cfg.hotkeys };
        for (const [action, acc] of Object.entries(value)) if (action in DEFAULTS.hotkeys && typeof acc === "string") hotkeys[action] = acc.slice(0, 60);
        cfg.hotkeys = hotkeys;
      } else if (key === "theme") {
        if (value in THEME_CSS || value === "default") cfg.theme = value;
      } else if (key === "vibeAnimation") {
        if (["on", "focus", "off"].includes(value)) cfg.vibeAnimation = value;
      } else {
        cfg[key] = value;
      }
    }
    return cfg;
  };
  ipcMain.handle("ymmods:set", (event, patch) => {
    if (!own(event) || !patch || typeof patch !== "object") return false;
    const cfg = applyConfigPatch(config(), patch);
    saveConfig(cfg);
    log.info("config updated", JSON.stringify(patch));
    appContents.forEach((wc) => (wc.isDestroyed() ? appContents.delete(wc) : applyFeatureCss(wc)));
    if ("hotkeys" in patch || "hotkeysEnabled" in patch) registerHotkeys();
    return { ok: true, hotkeyStatus };
  });
  ipcMain.handle("ymmods:toggle", (event, name, enabled) => {
    if (!own(event) || !isModFile(name)) return null;
    const base = name.replace(/^_+/, "");
    const target = enabled ? base : "_" + base;
    if (target !== name) fs.renameSync(path.join(modsDir, name), path.join(modsDir, target));
    return { name: target };
  });
  ipcMain.handle("ymmods:open", (event) => {
    if (own(event)) shell.openPath(modsDir);
  });

  // ── Player commands: play/pause/next/prev through the app's own IPC (as its tray menu does),
  //    like/volume through features.js in the page ────────────────────────
  const TRAY_TEXT = {
    ru: { mini: "Мини-плеер", sleep: "Таймер сна", min: (n) => `${n} мин`, track: "После текущего трека", off: "Выключить таймер", left: (n) => `осталось ${n} мин`, trackLeft: "до конца трека" },
    en: { mini: "Mini player", sleep: "Sleep timer", min: (n) => `${n} min`, track: "After current track", off: "Turn timer off", left: (n) => `${n} min left`, trackLeft: "until track ends" },
    kk: { mini: "Шағын ойнатқыш", sleep: "Ұйқы таймері", min: (n) => `${n} мин`, track: "Ағымдағы тректен кейін", off: "Таймерді өшіру", left: (n) => `${n} мин қалды`, trackLeft: "трек аяқталғанша" },
    uz: { mini: "Mini pleyer", sleep: "Uyqu taymeri", min: (n) => `${n} daq`, track: "Joriy trekdan keyin", off: "Taymerni o‘chirish", left: (n) => `${n} daq qoldi`, trackLeft: "trek tugaguncha" },
  };
  let trackState = {};
  const text = () => TRAY_TEXT[(trackState.lang || "").slice(0, 2)] || TRAY_TEXT.ru;
  const mainContents = () => [...appContents].find((wc) => !wc.isDestroyed() && isAppContents(wc));
  const appAction = (action) => { const wc = mainContents(); if (wc) wc.send("desktop:player:action", action); };
  const PAGE_COMMANDS = ["like", "volumeUp", "volumeDown"];
  const PLAYER_COMMANDS = ["playPause", "next", "prev", ...PAGE_COMMANDS];
  const showMainWindow = () => {
    if (!mainWin || mainWin.isDestroyed()) return;
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.show();
    mainWin.focus();
  };
  const playerCmd = (name) => {
    const run = () => {
      if (name === "playPause") appAction(isPlaying ? "PAUSE" : "PLAY");
      else if (name === "next") appAction("MOVE_FORWARD");
      else if (name === "prev") appAction("MOVE_BACKWARD");
      else if (PAGE_COMMANDS.includes(name)) {
        const wc = mainContents();
        if (wc) wc.executeJavaScript(`window.__ymModsPlayer && window.__ymModsPlayer.cmd(${JSON.stringify(name)})`).catch(() => {});
      } else if (name === "miniPlayer") toggleMini();
      else if (name === "closeMini") closeMini();
      else if (name === "showApp") showMainWindow();
    };
    if (PLAYER_COMMANDS.includes(name) && restoreUi && restoreUi(run)) return;
    run();
  };

  // ── Mini player window ───────────────────────────────────────────────────
  let mini = null;
  let creatingMini = false;
  const sendMini = () => { if (mini && !mini.isDestroyed()) mini.webContents.send("ymmods:mini-state", trackState); };
  const miniPosition = () => {
    const b = config().miniPlayerBounds;
    const W = 392, H = 116; // pill + 16px transparent margin for its shadow (see miniplayer.html)
    if (b && Number.isFinite(b.x) && Number.isFinite(b.y)) {
      const area = screen.getDisplayMatching({ x: b.x, y: b.y, width: W, height: H }).workArea;
      if (b.x >= area.x - W / 2 && b.x <= area.x + area.width - W / 2 && b.y >= area.y && b.y <= area.y + area.height - H / 2) return { x: b.x, y: b.y, width: W, height: H };
    }
    const area = screen.getPrimaryDisplay().workArea;
    return { x: area.x + area.width - W - 16, y: area.y + area.height - H - 16, width: W, height: H };
  };
  const openMini = () => {
    if (mini && !mini.isDestroyed()) { mini.showInactive(); return; }
    creatingMini = true;
    try {
      mini = new BrowserWindow({
        ...miniPosition(), frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false,
        fullscreenable: false, alwaysOnTop: true, skipTaskbar: true, hasShadow: false, show: false, backgroundColor: "#00000000",
        title: "Mini player",
        webPreferences: { preload: path.join(MOD_HOME, "mini-preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false },
      });
    } finally { creatingMini = false; }
    mini.setAlwaysOnTop(true, "floating");
    mini.loadFile(path.join(MOD_HOME, "miniplayer.html"));
    mini.once("ready-to-show", () => { mini.showInactive(); sendMini(); });
    let saveTimer;
    const savePosition = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (!mini || mini.isDestroyed()) return;
        const [x, y] = mini.getPosition();
        try { const cfg = config(); cfg.miniPlayerBounds = { x, y }; saveConfig(cfg); } catch (e) { log.error("mini bounds", e); }
      }, 400);
    };
    // Magnetic edges: released near a screen edge/corner, the pill springs to it
    const SNAP_DISTANCE = 48; // px from the edge that still pulls the pill in
    const PILL_MARGIN = 16; // transparent margin around the pill (miniplayer.html)
    const EDGE_GAP = 8; // pill distance from the screen edge once snapped
    let animating = null;
    let movedByUs = 0; // our own setBounds also fires "moved": ignore those for a moment
    const place = (bounds) => { movedByUs = Date.now(); mini.setBounds(bounds); };
    const snapMini = () => {
      if (!mini || mini.isDestroyed() || animating || Date.now() - movedByUs < 300) return;
      const [x, y] = mini.getPosition();
      // Fixed size: with fractional display scaling every setPosition rounds the size too and the window grows
      const { width: w, height: h } = miniPosition();
      const area = screen.getDisplayMatching({ x, y, width: w, height: h }).workArea;
      const left = area.x - PILL_MARGIN + EDGE_GAP;
      const right = area.x + area.width - w + PILL_MARGIN - EDGE_GAP;
      const top = area.y - PILL_MARGIN + EDGE_GAP;
      const bottom = area.y + area.height - h + PILL_MARGIN - EDGE_GAP;
      let tx = Math.abs(x - left) < SNAP_DISTANCE ? left : Math.abs(x - right) < SNAP_DISTANCE ? right : x;
      let ty = Math.abs(y - top) < SNAP_DISTANCE ? top : Math.abs(y - bottom) < SNAP_DISTANCE ? bottom : y;
      tx = Math.min(Math.max(tx, left), right); // never leave the screen
      ty = Math.min(Math.max(ty, top), bottom);
      if (tx === x && ty === y) { place({ x, y, width: w, height: h }); return savePosition(); }
      // easeOutBack: a short spring overshoot, then settles on the edge
      const duration = 260, s = 1.4, start = Date.now();
      const ease = (t) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
      animating = setInterval(() => {
        if (!mini || mini.isDestroyed()) { clearInterval(animating); animating = null; return; }
        const t = Math.min(1, (Date.now() - start) / duration);
        const k = ease(t);
        place({ x: Math.round(x + (tx - x) * k), y: Math.round(y + (ty - y) * k), width: w, height: h });
        if (t >= 1) {
          clearInterval(animating);
          // let the "moved" events of the animation itself pass before snapping is armed again
          setTimeout(() => { animating = null; }, 120);
          savePosition();
        }
      }, 16);
    };
    mini.on("moved", snapMini);
    mini.on("closed", () => { mini = null; });
  };
  // The mini player uses the app's own icons: symbols from icons/sprite.svg inside app.asar
  const MINI_ICONS = ["play_filled_xs", "pause_filled_xs", "next_xxs", "previous_xxs", "like_xxs", "liked_xxs", "close_xxs"];
  let miniIcons = null;
  const loadMiniIcons = () => {
    if (miniIcons) return miniIcons;
    miniIcons = {};
    try {
      const sprite = fs.readFileSync(path.join(appDir || path.join(process.resourcesPath, "app.asar"), "app", "icons", "sprite.svg"), "utf8");
      for (const id of MINI_ICONS) {
        const at = sprite.indexOf(`id="${id}"`);
        if (at < 0) continue;
        const start = sprite.lastIndexOf("<symbol", at);
        miniIcons[id] = sprite.slice(start, sprite.indexOf("</symbol>", at) + "</symbol>".length);
      }
    } catch (e) { log.error("mini icons", e); }
    return miniIcons;
  };
  ipcMain.handle("ymmods:mini-icons", (event) => (mini && !mini.isDestroyed() && event.sender === mini.webContents ? loadMiniIcons() : {}));
  const closeMini = () => { if (mini && !mini.isDestroyed()) mini.close(); };
  const toggleMini = () => (mini && !mini.isDestroyed() ? closeMini() : openMini());
  ipcMain.handle("ymmods:mini-toggle", (event) => { if (own(event)) toggleMini(); return !!mini; });
  ipcMain.on("ymmods:mini-cmd", (event, name) => {
    if (!mini || mini.isDestroyed() || event.sender !== mini.webContents || typeof name !== "string") return;
    playerCmd(name);
  });

  // ── Sleep timer: pause after N minutes or when the current track ends ────
  let sleep = { mode: "off", until: 0, track: "" };
  const trackKey = (s) => (s && s.title ? `${s.title}\u0000${s.artist}` : "");
  const sleepInfo = () => ({ mode: sleep.mode, minutesLeft: sleep.mode === "minutes" ? Math.max(0, Math.ceil((sleep.until - Date.now()) / 60000)) : 0 });
  const setSleep = (mode, minutes) => {
    if (mode === "minutes" && Number.isFinite(minutes) && minutes > 0) sleep = { mode, until: Date.now() + minutes * 60000, track: "" };
    else if (mode === "track") sleep = { mode, until: 0, track: trackKey(trackState) };
    else sleep = { mode: "off", until: 0, track: "" };
    log.info("sleep timer", JSON.stringify(sleepInfo()));
    return sleepInfo();
  };
  const fireSleep = () => {
    log.info("sleep timer fired");
    sleep = { mode: "off", until: 0, track: "" };
    if (isPlaying) playerCmd("playPause");
  };
  setInterval(() => { if (sleep.mode === "minutes" && Date.now() >= sleep.until) fireSleep(); }, 5000);
  ipcMain.handle("ymmods:sleep", (event, mode, minutes) => (own(event) ? setSleep(mode, Number(minutes)) : null));
  ipcMain.handle("ymmods:sleep-get", (event) => (own(event) ? sleepInfo() : null));

  // Track state reported by features.js
  ipcMain.on("ymmods:state", (event, state) => {
    if (!own(event) || !state || typeof state !== "object") return;
    trackState = state;
    sendMini();
    const key = trackKey(state);
    if (sleep.mode === "track") {
      if (!sleep.track) sleep.track = key;
      else if (key && key !== sleep.track) fireSleep(); // the next track has started
    }
  });

  // Extra tray menu items (inserted by augmentTrayMenu)
  const trayExtraItems = () => {
    const t = text();
    const info = sleepInfo();
    const status = info.mode === "minutes" ? ` (${t.left(info.minutesLeft)})` : info.mode === "track" ? ` (${t.trackLeft})` : "";
    const choice = (label, fn) => ({ label, click: fn });
    return [
      { label: t.mini, type: "checkbox", checked: !!(mini && !mini.isDestroyed()), click: () => toggleMini() },
      {
        label: t.sleep + status,
        submenu: [
          ...[15, 30, 45, 60, 90].map((n) => choice(t.min(n), () => setSleep("minutes", n))),
          choice(t.track, () => setSleep("track")),
          { type: "separator" },
          { label: t.off, enabled: sleep.mode !== "off", click: () => setSleep("off") },
        ],
      },
    ];
  };

  // ── Global hotkeys ───────────────────────────────────────────────────────
  let registeredHotkeys = [];
  let hotkeyStatus = {};
  const registerHotkeys = () => {
    if (!app.isReady()) return;
    for (const acc of registeredHotkeys) { try { globalShortcut.unregister(acc); } catch {} }
    registeredHotkeys = [];
    hotkeyStatus = {};
    const cfg = config();
    if (!cfg.hotkeysEnabled) return;
    for (const [action, acc] of Object.entries(cfg.hotkeys)) {
      if (!acc) continue;
      try {
        const ok = globalShortcut.register(acc, () => playerCmd(action));
        hotkeyStatus[action] = ok ? "ok" : "busy";
        if (ok) registeredHotkeys.push(acc);
      } catch (e) {
        hotkeyStatus[action] = "invalid";
      }
    }
    log.info("hotkeys", JSON.stringify(hotkeyStatus));
  };
  app.on("will-quit", () => { try { globalShortcut.unregisterAll(); } catch {} });

  // ── Export / import of mod settings (config + files from the mods folder) ─
  ipcMain.handle("ymmods:export", async (event) => {
    if (!own(event)) return { ok: false };
    const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
      defaultPath: path.join(app.getPath("documents"), "yandex-music-mods.json"),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    const mods = {};
    for (const f of fs.readdirSync(modsDir).filter(isModFile)) mods[f] = fs.readFileSync(path.join(modsDir, f), "utf8");
    const { miniPlayerBounds, ...cfg } = config();
    fs.writeFileSync(filePath, JSON.stringify({ format: "ymmods-settings", version: 1, exportedAt: new Date().toISOString(), config: cfg, mods }, null, 2));
    log.info("settings exported", filePath);
    return { ok: true, path: filePath, mods: Object.keys(mods).length };
  });
  ipcMain.handle("ymmods:import", async (event) => {
    if (!own(event)) return { ok: false };
    const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      properties: ["openFile"], filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePaths || !filePaths[0]) return { ok: false, canceled: true };
    let bundle;
    try { bundle = JSON.parse(fs.readFileSync(filePaths[0], "utf8").replace(/^﻿/, "")); } catch (e) { return { ok: false, error: "invalid JSON" }; }
    if (!bundle || bundle.format !== "ymmods-settings" || typeof bundle.config !== "object") return { ok: false, error: "not a mod settings file" };
    const cfg = config();
    for (const key of ["wheelKnown", "wheelKeep", "wheelSettingItem"]) if (key in bundle.config) cfg[key] = bundle.config[key];
    applyConfigPatch(cfg, bundle.config);
    saveConfig(cfg);
    let written = 0;
    for (const [name, content] of Object.entries(bundle.mods || {})) {
      if (!isModFile(name) || typeof content !== "string") continue;
      const base = name.replace(/^_+/, "");
      for (const variant of [base, "_" + base]) if (variant !== name) try { fs.unlinkSync(path.join(modsDir, variant)); } catch {}
      fs.writeFileSync(path.join(modsDir, name), content);
      written++;
    }
    registerHotkeys();
    log.info("settings imported", filePaths[0], written, "mods");
    setTimeout(() => { if (!event.sender.isDestroyed()) event.sender.reload(); }, 300);
    return { ok: true, mods: written };
  });

  // ── My Vibe wheel: filter the api.music.yandex.net/wheel/* response ──────
  const ARTIST_KEY = "artist:*";
  const TYPE_LABELS = { PROMO_LINK: "@promo", ALBUM: "@album", PLAYLIST: "@playlist", ARTIST: "@artistTile" };
  const titleOf = (data) => {
    if (!data || typeof data !== "object") return "";
    if (typeof data.title === "string") return data.title;
    if (typeof data.name === "string") return data.name;
    for (const value of Object.values(data)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (typeof value.title === "string") return value.title;
        if (typeof value.name === "string") return value.name;
      }
    }
    return "";
  };
  const filterWheel = (json) => {
    const root = json && json.result && Array.isArray(json.result.items) ? json.result : json;
    if (!root || !Array.isArray(root.items)) return null;
    const cfg = config();
    const isSetting = (item) => item.type === "SETTING";
    const keyOf = (item) => (/^artist:/.test(item.id) ? ARTIST_KEY : item.id);
    const known = { ...cfg.wheelKnown };
    // Full tiles of the kept keys with their last position: the server does not send every tile every time
    const saved = { ...cfg.wheelItems };
    const keep = new Set(cfg.wheelKeep);
    let changed = false;
    root.items.forEach((item, index) => {
      if (!item || typeof item.id !== "string" || isSetting(item)) return;
      const data = item.data || {};
      const wave = data.wave;
      const key = keyOf(item);
      const entry = key === ARTIST_KEY
        ? { name: "@artist", desc: "@artist" }
        : { name: (wave && wave.name) || titleOf(data) || item.id, desc: (wave && wave.description) || TYPE_LABELS[item.type] || item.type || "" };
      if (!known[key] || known[key].name !== entry.name || known[key].desc !== entry.desc) { known[key] = entry; changed = true; }
      // Control tiles ("Back to usual", "Shake My Vibe up") are contextual: only when the server sends them
      const isControl = typeof item.style === "string" && item.style.startsWith("CONTROL");
      if (key !== ARTIST_KEY && keep.has(key) && !isControl) {
        const next = { item, index };
        if (JSON.stringify(saved[key]) !== JSON.stringify(next)) { saved[key] = next; changed = true; }
      }
    });
    for (const [key, entry] of Object.entries(saved)) {
      const control = entry && entry.item && typeof entry.item.style === "string" && entry.item.style.startsWith("CONTROL");
      if (!keep.has(key) || control) { delete saved[key]; changed = true; }
    }
    cfg.wheelItems = saved;
    // Remember the "Customize My Vibe" tile: the server does not send it every time
    const settingItem = root.items.find((item) => item && isSetting(item));
    if (settingItem && JSON.stringify(settingItem) !== JSON.stringify(cfg.wheelSettingItem)) {
      cfg.wheelSettingItem = settingItem;
      changed = true;
    }
    if (changed) {
      cfg.wheelKnown = known;
      try { saveConfig(cfg); } catch (e) { log.error("save wheelKnown", e); }
    }
    const items = root.items.filter((item) => {
      if (!item || typeof item.id !== "string") return false;
      if (isSetting(item)) return !!cfg.wheelShowSettingsTile;
      return !cfg.wheelFilter || keep.has(keyOf(item));
    });
    // Kept tiles missing from this response come back from the saved copy, near their usual place
    if (cfg.wheelFilter) {
      const present = new Set(items.filter((item) => !isSetting(item)).map(keyOf));
      const missing = [...keep].filter((key) => key !== ARTIST_KEY && !present.has(key) && saved[key]).sort((a, b) => saved[a].index - saved[b].index);
      for (const key of missing) items.splice(Math.min(saved[key].index, items.length), 0, saved[key].item);
      if (missing.length) log.info("wheel restored", missing.join(", "));
    }
    if (cfg.wheelShowSettingsTile && cfg.wheelSettingItem && !items.some(isSetting)) items.push(cfg.wheelSettingItem);
    if (items.length === root.items.length && items.every((item, i) => item === root.items[i])) return null;
    if (!items.some((item) => !isSetting(item))) return null;
    log.info("wheel filtered", root.items.length, "->", items.length);
    root.items = items;
    return json;
  };
  const setupWheel = (win) => {
    const dbg = win.webContents.debugger;
    try { dbg.attach("1.3"); } catch (e) { return log.error("debugger attach failed", e); }
    dbg.sendCommand("Fetch.enable", { patterns: [{ urlPattern: "*api.music.yandex.net/wheel/*", requestStage: "Response" }] })
      .catch((e) => log.error("Fetch.enable", e));
    dbg.on("message", async (_event, method, params) => {
      if (method !== "Fetch.requestPaused") return;
      const { requestId } = params;
      try {
        if (params.responseStatusCode === 200) {
          const { body, base64Encoded } = await dbg.sendCommand("Fetch.getResponseBody", { requestId });
          const text = base64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
          const out = text ? filterWheel(JSON.parse(text)) : null;
          if (out) {
            const responseHeaders = (params.responseHeaders || []).filter((h) => !/^(content-length|content-encoding)$/i.test(h.name));
            await dbg.sendCommand("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders, body: Buffer.from(JSON.stringify(out)).toString("base64") });
            return;
          }
        }
      } catch (e) {
        log.error("wheel filter", e);
      }
      dbg.sendCommand("Fetch.continueRequest", { requestId }).catch(() => {});
    });
  };

  // ── Metrics blocker: Metrica, click/error counters, player logs (not plays/feedback) ──
  const METRICS_URLS = [
    "*://mc.yandex.ru/*", "*://mc.yandex.com/*", "*://mc.yandex.by/*", "*://mc.yandex.kz/*", "*://mc.yandex.uz/*",
    "*://mc.webvisor.org/*", "*://mc.webvisor.com/*",
    "*://yandex.ru/clck/click*", "*://yandex.com/clck/click*",
    "*://log.strm.yandex.ru/*", "*://log.strm.yandex.net/*",
  ];
  // Ads: the ad SDK, Yandex Advertising Network, AdFox, partner ad bundles
  const ADS_URLS = [
    "*://yandex.ru/ads/*", "*://yandex.com/ads/*", "*://an.yandex.ru/*", "*://yandex.ru/an/*",
    "*://*.adfox.ru/*", "*://yastatic.net/partner-code-bundles/*",
  ];
  const isAdUrl = (url) => /^https?:\/\/(yandex\.(ru|com)\/(ads|an)\/|an\.yandex\.ru\/|[^/]*\.?adfox\.ru\/|yastatic\.net\/partner-code-bundles\/)/.test(url);
  let blockCache = { at: 0, metrics: true, ads: true };
  const blocked = { metrics: 0, ads: 0 };
  const blockSettings = () => {
    if (Date.now() - blockCache.at > 2000) { const cfg = config(); blockCache = { at: Date.now(), metrics: !!cfg.blockMetrics, ads: !!cfg.blockAds }; }
    return blockCache;
  };
  const sessionsSetUp = new WeakSet();
  const setupSession = (ses) => {
    if (!ses || sessionsSetUp.has(ses)) return;
    sessionsSetUp.add(ses);
    // One handler per session is allowed, so metrics and ads share it
    ses.webRequest.onBeforeRequest({ urls: [...METRICS_URLS, ...ADS_URLS] }, (details, callback) => {
      const kind = isAdUrl(details.url) ? "ads" : "metrics";
      const cancel = blockSettings()[kind];
      if (cancel && ++blocked[kind] % 50 === 1) log.info(kind + " blocked", blocked[kind], new URL(details.url).host);
      callback({ cancel });
    });
    // Bridge for the page (window.ymMods / window.ymModsFlags)
    const preload = path.join(MOD_HOME, "preload.js");
    try {
      if (typeof ses.registerPreloadScript === "function") {
        ses.registerPreloadScript({ type: "frame", id: "ymmods", filePath: preload });
      } else {
        ses.setPreloads([...ses.getPreloads().filter((p) => p !== preload), preload]);
      }
    } catch (e) { log.error("preload", e); }
  };

  // ── Yandex ID profile menu iframe: transparent background for profile-menu.css ──
  const isUserIdFrame = (url) => {
    try {
      const u = new URL(url);
      return /(^|\.)yandex\.(ru|com|by|kz|uz)$/.test(u.hostname) && u.pathname.startsWith("/user-id");
    } catch { return false; }
  };
  const setupFrames = (win) => {
    win.webContents.on("did-frame-finish-load", (_event, isMainFrame, frameProcessId, frameRoutingId) => {
      if (isMainFrame || !fs.existsSync(path.join(modsDir, "profile-menu.css"))) return;
      const frame = webFrameMain.fromId(frameProcessId, frameRoutingId);
      if (!frame || !isUserIdFrame(frame.url)) return;
      frame.executeJavaScript(`(() => {
        let s = document.getElementById("ymmods-profile");
        if (!s) { s = document.createElement("style"); s.id = "ymmods-profile"; document.documentElement.appendChild(s); }
        s.textContent = "html,body{background:transparent!important}";
      })()`).catch((e) => log.error("profile frame", e));
    });
  };

  // ── Wiring ───────────────────────────────────────────────────────────────
  app.on("ready", () => {
    setupUpdater();
    setupSession(session.defaultSession);
  });
  let mainWindowSetUp = false;
  app.on("browser-window-created", (_event, win) => {
    if (creatingMini) return; // our own mini player window
    setupSession(win.webContents.session);
    setupWheel(win);
    setupInjection(win);
    setupFrames(win);
    // Tray behaviour only for the window that shows the app itself
    win.webContents.on("did-navigate", (_e, url) => {
      // Hotkeys too: a second instance (which only hands over to the first one) never gets here
      if (!mainWindowSetUp && isAppUrl(url)) { mainWindowSetUp = true; setupTray(win); registerHotkeys(); }
    });
  });
  log.info("mod loaded from", MOD_HOME);
};
