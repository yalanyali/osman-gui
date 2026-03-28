import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

type Listener = (data: unknown) => void
type WrappedListener = (event: IpcRendererEvent, data: unknown) => void

// Map original fn refs to wrapped listeners so removeListener works correctly
const listenerMap = new Map<Listener, WrappedListener>()
const ALLOWED_CHANNELS: string[] = ['install-progress', 'dl-progress', 'dl-done', 'dl-error', 'update-status']

contextBridge.exposeInMainWorld('api', {
  checkBinaries: () => ipcRenderer.invoke('check-binaries'),
  installYtDlp: () => ipcRenderer.invoke('install-ytdlp'),
  installFfmpeg: () => ipcRenderer.invoke('install-ffmpeg'),
  updateYtDlp: () => ipcRenderer.invoke('update-ytdlp'),
selectFolder: () => ipcRenderer.invoke('select-folder'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
  download: (opts: unknown) => ipcRenderer.invoke('download', opts),
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  on(channel: string, fn: Listener) {
    if (!ALLOWED_CHANNELS.includes(channel)) return
    const wrapped: WrappedListener = (_, data) => fn(data)
    listenerMap.set(fn, wrapped)
    ipcRenderer.on(channel, wrapped)
  },

  off(channel: string, fn: Listener) {
    const wrapped = listenerMap.get(fn)
    if (wrapped) {
      ipcRenderer.removeListener(channel, wrapped)
      listenerMap.delete(fn)
    }
  },
})
