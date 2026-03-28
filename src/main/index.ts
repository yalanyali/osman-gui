import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { checkBinaries, installYtDlp, installFfmpeg } from './binaries.js'
import { startDownload, cancelDownload } from './downloader.js'

const isDev = process.env.NODE_ENV === 'development'

interface Config {
  outputDir: string
}

function getConfigPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

function loadConfig(): Config {
  const p = getConfigPath()
  if (existsSync(p)) {
    try { return JSON.parse(readFileSync(p, 'utf8')) as Config } catch {}
  }
  return { outputDir: app.getPath('downloads') }
}

function saveConfig(updates: Partial<Config>): void {
  writeFileSync(getConfigPath(), JSON.stringify({ ...loadConfig(), ...updates }, null, 2))
}

let win: BrowserWindow | undefined

function createWindow(): void {
  win = new BrowserWindow({
    width: 520,
    height: 650,
    resizable: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1c1c1e',
  })

  if (isDev) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  if (!isDev) {
    autoUpdater.autoDownload = true
    autoUpdater.on('update-available', (info) =>
      win?.webContents.send('update-status', { status: 'available', version: info.version }))
    autoUpdater.on('download-progress', ({ percent }) =>
      win?.webContents.send('update-status', { status: 'downloading', percent: Math.floor(percent) }))
    autoUpdater.on('update-downloaded', (info) =>
      win?.webContents.send('update-status', { status: 'ready', version: info.version }))
    autoUpdater.on('update-not-available', () =>
      win?.webContents.send('update-status', { status: 'not-available' }))
    autoUpdater.on('error', (err) =>
      win?.webContents.send('update-status', { status: 'error', error: err.message }))
    autoUpdater.checkForUpdates()
  }
})

app.on('window-all-closed', () => app.quit())

// IPC handlers

ipcMain.handle('check-binaries', () =>
  checkBinaries(app.getPath('userData'))
)

ipcMain.handle('install-ytdlp', async (event) => {
  try {
    await installYtDlp(app.getPath('userData'), (p) =>
      event.sender.send('install-progress', { type: 'ytdlp', progress: p })
    )
    return { success: true, binaries: checkBinaries(app.getPath('userData')) }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('install-ffmpeg', async (event) => {
  try {
    await installFfmpeg(app.getPath('userData'), (p) =>
      event.sender.send('install-progress', { type: 'ffmpeg', progress: p })
    )
    return { success: true, binaries: checkBinaries(app.getPath('userData')) }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('update-ytdlp', async (event) => {
  try {
    await installYtDlp(app.getPath('userData'), (p) =>
      event.sender.send('install-progress', { type: 'ytdlp', progress: p })
    )
    return { success: true, binaries: checkBinaries(app.getPath('userData')) }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})


ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openDirectory'],
    defaultPath: loadConfig().outputDir,
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const dir = result.filePaths[0]
    saveConfig({ outputDir: dir })
    return dir
  }
  return null
})

ipcMain.handle('get-config', () => loadConfig())

ipcMain.handle('open-folder', (_, folderPath: string) => shell.openPath(folderPath))

ipcMain.handle('download', (event, { url, format, outputDir }: { url: string; format: string; outputDir: string }) => {
  startDownload(
    { url, format, outputDir, binDir: join(app.getPath('userData'), 'bin') },
    (data) => event.sender.send('dl-progress', data),
    (data) => event.sender.send('dl-done', data),
    (data) => event.sender.send('dl-error', data),
  )
  return { started: true }
})

ipcMain.handle('cancel-download', () => { cancelDownload() })

ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('check-for-updates', () => { if (!isDev) autoUpdater.checkForUpdates() })
ipcMain.handle('install-update', () => autoUpdater.quitAndInstall())
