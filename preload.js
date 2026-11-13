const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('widget', {
  onUsage: cb => ipcRenderer.on('usage', (_e, d) => cb(d)),
  onDiag: cb => ipcRenderer.on('diag', (_e, d) => cb(d)),
  onEvent: cb => ipcRenderer.on('event', () => cb()),
  ready: () => ipcRenderer.send('ready'),
  menu: () => ipcRenderer.send('menu')
});
