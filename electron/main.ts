import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './db/index'
import { registerPatternHandlers } from './ipc/pattern.ipc'
import { registerWorkHandlers } from './ipc/work.ipc'
import { registerWorkFileHandlers } from './ipc/work-file.ipc'
import { registerGuideHandlers } from './ipc/guide.ipc'
import { registerTagHandlers } from './ipc/tag.ipc'
import { registerStatsHandlers } from './ipc/stats.ipc'
import { registerClaudeHandlers } from './ipc/claude.ipc'
import { registerFileHandlers } from './ipc/file.ipc'
import { registerDiscoveryHandlers } from './ipc/discovery.ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.skillforge.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database and run migrations
  initDatabase()

  // Register all IPC handlers
  registerPatternHandlers()
  registerWorkHandlers()
  registerWorkFileHandlers()
  registerGuideHandlers()
  registerTagHandlers()
  registerStatsHandlers()
  registerFileHandlers()

  createWindow()

  // Register handlers that need mainWindow reference
  registerClaudeHandlers(mainWindow!)
  // Pass getter so discovery handlers always use the current window
  registerDiscoveryHandlers(() => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
