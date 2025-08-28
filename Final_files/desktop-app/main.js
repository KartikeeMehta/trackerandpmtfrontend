const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Load Parcel-built file during dev; load packaged renderer in prod
  const devUrl = process.env.ELECTRON_START_URL;
  if (!app.isPackaged && devUrl) {
    win.loadURL(devUrl);
  } else {
    const fileUrl = pathToFileURL(path.join(__dirname, 'renderer', 'index.html')).toString();
    win.loadURL(fileUrl)
  }
  // Optional: open devtools in dev
  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  return win
}

let tray = null
let mainWindow = null
let userEmailForDisconnect = null
let isQuitting = false

app.whenReady().then(() => {
  mainWindow = createWindow()

  // Tray setup
  // Create a tiny tray icon from embedded PNG to avoid missing-file issues
  const trayPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAIVBMVEX///8AAABGRkYzMzM7Ozs3NzcvLy9hYWFvb28/Pz9QUFBcXFz7mH0aAAAAKElEQVQY02NgQAXGZGBgYGBQwMDA8IEMGBgYwFQGBhYgqAQYB0Q0gAAAPf0ALN9wQyMAAAAASUVORK5CYII='
  const trayImage = nativeImage.createFromDataURL(`data:image/png;base64,${trayPngBase64}`)
  tray = new Tray(trayImage)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => { if (mainWindow) { mainWindow.show() } } },
    { label: 'Start', click: () => { if (mainWindow) mainWindow.webContents.send('tracker:start') } },
    { label: 'Stop', click: () => { if (mainWindow) mainWindow.webContents.send('tracker:stop') } },
    { type: 'separator' },
    { label: 'Quit', click: async () => {
        try {
          if (userEmailForDisconnect) {
            const fetch = (await import('node-fetch')).default
            await fetch('http://localhost:8000/api/pairing/disconnect-by-email', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userEmailForDisconnect })
            })
          }
        } catch {}
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setToolTip('ProjectFlow Tracker')
  tray.setContextMenu(contextMenu)

  // Minimize to tray behavior
  mainWindow.on('close', (e) => {
    if (isQuitting) return
    e.preventDefault()
    mainWindow.hide()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!isQuitting) return
    app.quit()
  }
})

// Receive email from renderer to use on forced quit
ipcMain.on('set-user-email', (_evt, email) => {
  userEmailForDisconnect = email || null
})


