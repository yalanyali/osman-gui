declare module '*.css'

interface BinaryStatus {
  ytdlp: boolean
  ffmpeg: boolean
  gallerydl: boolean
  version: string | null
}

interface InstallResult {
  success: boolean
  binaries?: BinaryStatus
  error?: string
}

type UpdateStatusData =
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready'; version: string }
  | { status: 'not-available' }
  | { status: 'error'; error: string }

interface Window {
  api: {
    checkBinaries(): Promise<BinaryStatus>
    installYtDlp(): Promise<InstallResult>
    installFfmpeg(): Promise<InstallResult>
    updateYtDlp(): Promise<InstallResult>
    installGalleryDl(): Promise<InstallResult>
    updateGalleryDl(): Promise<InstallResult>
    selectFolder(): Promise<string | null>
    getConfig(): Promise<{ outputDir: string }>
    openFolder(path: string): Promise<void>
    download(opts: { url: string; format: string; outputDir: string }): Promise<{ started: boolean }>
    cancelDownload(): Promise<void>
    getAppVersion(): Promise<string>
    checkForUpdates(): Promise<void>
    installUpdate(): Promise<void>
    on(channel: string, fn: (data: unknown) => void): void
    off(channel: string, fn: (data: unknown) => void): void
  }
}
