"use strict";
// Session preload of the mod: exposes window.ymMods (settings UI / page features bridge) and window.ymModsFlags
// (read by the patched wheel code before the page's own scripts run). Only on the app page itself.
const { contextBridge, ipcRenderer } = require("electron");

if (window === window.top && location.protocol === "music-application:") {
  let flags = {};
  try { flags = ipcRenderer.sendSync("ymmods:flags") || {}; } catch {}
  contextBridge.exposeInMainWorld("ymModsFlags", flags);
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
    onUpdateProgress: (listener) => ipcRenderer.on("ymmods:update-progress", (_event, data) => listener(data)),
  });
}
