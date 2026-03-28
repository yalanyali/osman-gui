import React, { useState, useEffect } from 'react'
import DownloadForm from './components/DownloadForm'
import ProgressBar from './components/ProgressBar'
import BinaryManager from './components/BinaryManager'

export default function App() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('video')
  const [outputDir, setOutputDir] = useState('')
  const [dlState, setDlState] = useState('idle') // idle | downloading | done | error
  const [progress, setProgress] = useState(0)
  const [filename, setFilename] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [binaries, setBinaries] = useState({ ytdlp: false, ffmpeg: false, version: null })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [installing, setInstalling] = useState({ ytdlp: false, ffmpeg: false })
  const [installProgress, setInstallProgress] = useState({ ytdlp: 0, ffmpeg: 0 })
  const [installError, setInstallError] = useState({ ytdlp: null, ffmpeg: null })
  const [appVersion, setAppVersion] = useState(null)
  const [updateStatus, setUpdateStatus] = useState(null)

  useEffect(() => {
    window.api.checkBinaries().then((b) => {
      setBinaries(b)
      if (!b.ytdlp) setSettingsOpen(true)
    })
    window.api.getConfig().then((cfg) => setOutputDir(cfg.outputDir))
    window.api.getAppVersion().then(setAppVersion)

    const onInstallProgress = ({ type, progress: p }) => {
      setInstallProgress((prev) => ({ ...prev, [type]: p }))
    }

    const onDlProgress = ({ percent, filename: f, status: s }) => {
      if (percent !== undefined) setProgress(percent)
      if (f) setFilename(f)
      if (s) setStatusMsg(s)
    }

    const onDlDone = () => {
      setDlState('done')
      setProgress(100)
    }

    const onDlError = ({ message }) => {
      setDlState('error')
      setStatusMsg(message)
    }

    const onUpdateStatus = (data) => setUpdateStatus(data)

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

  const handleInstall = async (type) => {
    setInstalling((prev) => ({ ...prev, [type]: true }))
    setInstallError((prev) => ({ ...prev, [type]: null }))
    setInstallProgress((prev) => ({ ...prev, [type]: 0 }))

    const fn = type === 'ytdlp' ? window.api.installYtDlp : window.api.installFfmpeg
    const result = await fn()

    setInstalling((prev) => ({ ...prev, [type]: false }))
    if (result.success) {
      setBinaries(result.binaries)
    } else {
      setInstallError((prev) => ({ ...prev, [type]: result.error }))
    }
  }

  const canDownload =
    binaries.ytdlp &&
    !!url.trim() &&
    !!outputDir &&
    dlState !== 'downloading'

  return (
    <div className="app">
      <div className="titlebar">
        <span className="titlebar-title">yt-dlp</span>
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

        {!binaries.ytdlp && dlState === 'idle' && (
          <div className="binary-warning">
            yt-dlp not installed — open Settings ⚙ to install
          </div>
        )}
      </div>

      {settingsOpen && (
        <BinaryManager
          binaries={binaries}
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
