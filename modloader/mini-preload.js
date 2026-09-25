"use strict";
// Preload of the mini player window (modloader/miniplayer.html)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ymMini", {
  onState: (listener) => ipcRenderer.on("ymmods:mini-state", (_event, state) => listener(state)),
  getIcons: () => ipcRenderer.invoke("ymmods:mini-icons"),
  cmd: (name) => ipcRenderer.send("ymmods:mini-cmd", name),
  close: () => ipcRenderer.send("ymmods:mini-cmd", "closeMini"),
  showApp: () => ipcRenderer.send("ymmods:mini-cmd", "showApp"),
});
