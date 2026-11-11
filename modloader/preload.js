"use strict";
// Session preload of the mod: exposes window.ymMods (settings UI / page features bridge) and window.ymModsFlags
// (read by the patched wheel code before the page's own scripts run). Only on the app page itself.
const { contextBridge, ipcRenderer, webFrame } = require("electron");

if (window === window.top && location.protocol === "music-application:") {
  let flags = {};
  try { flags = ipcRenderer.sendSync("ymmods:flags") || {}; } catch {}
  contextBridge.exposeInMainWorld("ymModsFlags", flags);
  // Before the page's own scripts: the My Vibe wave is created transparent on see-through themes (glass, Mica,
  // Acrylic) — the app creates it with a dark backdrop for its own black page, which shows there as black edges.
  // The flag comes with the flags at load; main.js updates window.__ymModsTransparentVibe when the theme changes
  try {
    webFrame.executeJavaScript(`(() => {
      if (window.__ymModsWorkerHook || typeof Worker === "undefined") return;
      window.__ymModsWorkerHook = true;
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (msg, ...rest) {
        try {
          if (msg && msg.source === "vibe" && msg.type === "vibe-animation-worker-init" && msg.payload) {
            const flag = window.__ymModsTransparentVibe;
            const on = flag !== undefined ? flag : !!(window.ymModsFlags && window.ymModsFlags.vibeTransparent);
            if (on) msg.payload.shaderOptions = Object.assign({}, msg.payload.shaderOptions, { transparent: true });
          }
        } catch (e) {}
        return post.call(this, msg, ...rest);
      };
    })()`);
  } catch {}
  contextBridge.exposeInMainWorld("ymMods", {
    getState: () => ipcRenderer.invoke("ymmods:get"),
    setConfig: (patch) => ipcRenderer.invoke("ymmods:set", patch),
    toggleMod: (name, enabled) => ipcRenderer.invoke("ymmods:toggle", name, enabled),
    openDir: () => ipcRenderer.invoke("ymmods:open"),
    reportState: (state) => ipcRenderer.send("ymmods:state", state),
    toggleMiniPlayer: () => ipcRenderer.invoke("ymmods:mini-toggle"),
    setSleepTimer: (mode, minutes) => ipcRenderer.invoke("ymmods:sleep", mode, minutes),
    getSleepTimer: () => ipcRenderer.invoke("ymmods:sleep-get"),
    exportSettings: () => ipcRenderer.invoke("ymmods:export"),
    importSettings: () => ipcRenderer.invoke("ymmods:import"),
    storageInfo: () => ipcRenderer.invoke("ymmods:storage"),
    clearCache: () => ipcRenderer.invoke("ymmods:clear-cache"),
    moveDownloads: (toDefault) => ipcRenderer.invoke("ymmods:downloads-move", !!toDefault),
    cancelDownloadsMove: () => ipcRenderer.invoke("ymmods:downloads-cancel"),
    relaunch: () => ipcRenderer.invoke("ymmods:relaunch"),
    lastfmLogin: () => ipcRenderer.invoke("ymmods:lastfm-login"),
    lastfmLogout: () => ipcRenderer.invoke("ymmods:lastfm-logout"),
    modUpdate: (action) => ipcRenderer.invoke("ymmods:mod-update", action),
    modChangelog: () => ipcRenderer.invoke("ymmods:mod-changelog"),
    localApi: (action) => ipcRenderer.invoke("ymmods:local-api", action),
    openReleases: () => ipcRenderer.invoke("ymmods:open-releases"),
    videoFile: (url, wantBytes) => ipcRenderer.invoke("ymmods:video", url, !!wantBytes),
    onUpdateProgress: (listener) => ipcRenderer.on("ymmods:update-progress", (_event, data) => listener(data)),
  });
}
