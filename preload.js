const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  fetchTikwm: (url) => ipcRenderer.invoke('tikwm-fetch', url),
  downloadFile: (url, filename) => ipcRenderer.invoke('download-file', { url, filename })
});
