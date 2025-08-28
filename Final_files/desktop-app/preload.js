const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('trackerAPI', {
  setUserEmail: (email) => ipcRenderer.send('set-user-email', email),
  onStart: (cb) => ipcRenderer.on('tracker:start', cb),
  onStop: (cb) => ipcRenderer.on('tracker:stop', cb),
})

