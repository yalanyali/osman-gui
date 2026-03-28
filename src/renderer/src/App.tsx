import React, { useState, useEffect } from 'react'
import DownloadForm from './components/DownloadForm'
import ProgressBar from './components/ProgressBar'
import BinaryManager from './components/BinaryManager'

type DlState = 'idle' | 'downloading' | 'done' | 'error'
type BinaryType = 'ytdlp' | 'ffmpeg' | 'gallerydl'

export default function App() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('audio')
  const [outputDir, setOutputDir] = useState('')
  const [dlState, setDlState] = useState<DlState>('idle')
  const [progress, setProgress] = useState(0)
  const [filename, setFilename] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [binaries, setBinaries] = useState<BinaryStatus>({ ytdlp: false, ffmpeg: false, gallerydl: false, version: null })
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [installing, setInstalling] = useState<Record<BinaryType, boolean>>({ ytdlp: false, ffmpeg: false, gallerydl: false })
  const [installProgress, setInstallProgress] = useState<Record<BinaryType, number>>({ ytdlp: 0, ffmpeg: 0, gallerydl: 0 })
  const [installError, setInstallError] = useState<Record<BinaryType, string | null>>({ ytdlp: null, ffmpeg: null, gallerydl: null })
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusData | null>(null)
  const [binariesLoading, setBinariesLoading] = useState(true)

  useEffect(() => {
    window.api.checkBinaries().then((b) => {
      setBinaries(b)
      setBinariesLoading(false)
      if (!b.ytdlp) setSettingsOpen(true)
      if (!b.ytdlp) handleInstall('ytdlp')
      if (!b.ffmpeg) handleInstall('ffmpeg')
      if (!b.gallerydl) handleInstall('gallerydl')
    })
    window.api.getConfig().then((cfg) => setOutputDir(cfg.outputDir))
    window.api.getAppVersion().then(setAppVersion)

    const onInstallProgress = (data: unknown) => {
      const { type, progress: p } = data as { type: BinaryType; progress: number }
      setInstallProgress((prev) => ({ ...prev, [type]: p }))
    }

    const onDlProgress = (data: unknown) => {
      const { percent, filename: f, status: s } = data as { percent?: number; filename?: string; status?: string }
      if (percent !== undefined) setProgress(percent)
      if (f) setFilename(f)
      if (s) setStatusMsg(s)
    }

    const onDlDone = () => {
      setDlState('done')
      setProgress(100)
      setUrl('')
    }

    const onDlError = (data: unknown) => {
      const { message } = data as { message: string }
      setDlState('error')
      setStatusMsg(message)
    }

    const onUpdateStatus = (data: unknown) => setUpdateStatus(data as UpdateStatusData)

    window.api.on('install-progress', onInstallProgress)
    window.api.on('dl-progress', onDlProgress)
    window.api.on('dl-done', onDlDone)
    window.api.on('dl-error', onDlError)
    window.api.on('update-status', onUpdateStatus)

    return () => {
      window.api.off('install-progress', onInstallProgress)
      window.api.off('dl-progress', onDlProgress)
      window.api.off('dl-done', onDlDone)
      window.api.off('dl-error', onDlError)
      window.api.off('update-status', onUpdateStatus)
    }
  }, [])

  const handleSelectFolder = async () => {
    const dir = await window.api.selectFolder()
    if (dir) setOutputDir(dir)
  }

  const handleDownload = () => {
    if (!url.trim() || !outputDir) return
    setDlState('downloading')
    setProgress(0)
    setFilename('')
    setStatusMsg('')
    window.api.download({ url: url.trim(), format, outputDir })
  }

  const handleCancel = () => {
    window.api.cancelDownload()
    setDlState('idle')
    setProgress(0)
    setFilename('')
    setStatusMsg('')
  }

  const resetProgress = () => {
    setDlState('idle')
    setProgress(0)
    setFilename('')
    setStatusMsg('')
  }

  const handleInstall = async (type: BinaryType) => {
    setInstalling((prev) => ({ ...prev, [type]: true }))
    setInstallError((prev) => ({ ...prev, [type]: null }))
    setInstallProgress((prev) => ({ ...prev, [type]: 0 }))

    const fn = type === 'ytdlp' ? window.api.installYtDlp
      : type === 'gallerydl' ? window.api.installGalleryDl
      : window.api.installFfmpeg
    const result = await fn()

    setInstalling((prev) => ({ ...prev, [type]: false }))
    if (result.success) {
      setBinaries(result.binaries!)
    } else {
      setInstallError((prev) => ({ ...prev, [type]: result.error ?? null }))
    }
  }

  const canDownload =
    (binaries.ytdlp || binaries.gallerydl) &&
    !!url.trim() &&
    !!outputDir &&
    dlState !== 'downloading'

  return (
    <div className="app">
      <div className="titlebar">
        <span className="titlebar-title">Osman App</span>
        <button
          className={`settings-btn ${settingsOpen ? 'active' : ''}`}
          onClick={() => setSettingsOpen((v) => !v)}
          title="Settings"
        >
          ⚙{updateStatus?.status === 'ready' && <span className="update-badge" />}
        </button>
      </div>

      <div className="content">
        <DownloadForm
          url={url}
          setUrl={setUrl}
          format={format}
          setFormat={setFormat}
          outputDir={outputDir}
          onSelectFolder={handleSelectFolder}
          onDownload={handleDownload}
          onCancel={handleCancel}
          dlState={dlState}
          canDownload={canDownload}
        />

        {dlState !== 'idle' && (
          <ProgressBar
            dlState={dlState}
            progress={progress}
            filename={filename}
            statusMsg={statusMsg}
            outputDir={outputDir}
            onOpenFolder={() => window.api.openFolder(outputDir)}
            onReset={resetProgress}
          />
        )}

        {!binariesLoading && !binaries.ytdlp && !binaries.gallerydl && dlState === 'idle' && (
          <div className="binary-warning">
            yt-dlp kurulu değil — kurmak için Ayarlar ⚙ bölümünü aç
          </div>
        )}
      </div>

      {settingsOpen && (
        <BinaryManager
          binaries={binaries}
          binariesLoading={binariesLoading}
          installing={installing}
          installProgress={installProgress}
          installError={installError}
          onInstall={handleInstall}
          onUpdate={() => handleInstall('ytdlp')}
          appVersion={appVersion}
          updateStatus={updateStatus}
          onCheckForUpdates={() => window.api.checkForUpdates()}
          onInstallUpdate={() => window.api.installUpdate()}
        />
      )}
    </div>
  )
}
