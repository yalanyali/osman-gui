import React from 'react'

interface BinaryRowProps {
  name: string
  loading?: boolean
  installed: boolean
  version?: string | null
  installing: boolean
  progress: number
  error: string | null
  onInstall: () => void
  onUpdate?: () => void
}

function BinaryRow({ name, loading, installed, version, installing, progress, error, onInstall, onUpdate }: BinaryRowProps) {
  return (
    <div className="binary-row">
      <div className="binary-info">
        <span className="binary-name">{name}</span>
        {loading ? (
          <span className="binary-status">…</span>
        ) : installed ? (
          <span className="binary-status ok">{version || 'kurulu'}</span>
        ) : (
          <span className="binary-status missing">kurulu değil</span>
        )}
      </div>
      <div className="binary-actions">
        {installing ? (
          <span className="binary-progress">{progress}%</span>
        ) : installed ? (
          onUpdate && (
            <button className="link-btn" onClick={onUpdate}>
              Güncelle
            </button>
          )
        ) : (
          <button className="link-btn" onClick={onInstall}>
            Kur
          </button>
        )}
      </div>
      {error && <div className="binary-error">{error}</div>}
    </div>
  )
}

interface AppUpdateRowProps {
  appVersion: string | null
  updateStatus: UpdateStatusData | null
  onCheckForUpdates: () => void
  onInstallUpdate: () => void
}

function AppUpdateRow({ appVersion, updateStatus, onCheckForUpdates, onInstallUpdate }: AppUpdateRowProps) {
  const isDownloading = updateStatus?.status === 'downloading'

  let statusEl: React.ReactNode = null
  if (updateStatus?.status === 'available') {
    statusEl = <span className="binary-status">v{updateStatus.version} mevcut</span>
  } else if (isDownloading && updateStatus?.status === 'downloading') {
    statusEl = <span className="binary-status">{updateStatus.percent}%</span>
  } else if (updateStatus?.status === 'ready') {
    statusEl = <span className="binary-status ok">kurulmaya hazır</span>
  } else if (updateStatus?.status === 'error') {
    statusEl = <span className="binary-status missing">güncelleme hatası</span>
  }

  let actionEl: React.ReactNode = null
  if (updateStatus?.status === 'ready') {
    actionEl = (
      <button className="link-btn" onClick={onInstallUpdate}>
        Yeniden Başlat
      </button>
    )
  } else if (!isDownloading) {
    actionEl = (
      <button className="link-btn" onClick={onCheckForUpdates}>
        Kontrol Et
      </button>
    )
  }

  return (
    <div className="binary-row">
      <div className="binary-info">
        <span className="binary-name">Osman App</span>
        <span className="binary-status ok">{appVersion ? `v${appVersion}` : ''}</span>
        {statusEl}
      </div>
      <div className="binary-actions">{actionEl}</div>
      {updateStatus?.status === 'error' && (
        <div className="binary-error">{updateStatus.error}</div>
      )}
    </div>
  )
}

type BinaryType = 'ytdlp' | 'ffmpeg' | 'gallerydl'

interface BinaryManagerProps {
  binaries: BinaryStatus
  binariesLoading: boolean
  installing: Record<BinaryType, boolean>
  installProgress: Record<BinaryType, number>
  installError: Record<BinaryType, string | null>
  onInstall: (type: BinaryType) => void
  onUpdate: () => void
  appVersion: string | null
  updateStatus: UpdateStatusData | null
  onCheckForUpdates: () => void
  onInstallUpdate: () => void
}

export default function BinaryManager({
  binaries, binariesLoading, installing, installProgress, installError, onInstall, onUpdate,
  appVersion, updateStatus, onCheckForUpdates, onInstallUpdate,
}: BinaryManagerProps) {
  return (
    <div className="settings-panel">
      <div className="settings-title">Uygulama</div>
      <AppUpdateRow
        appVersion={appVersion}
        updateStatus={updateStatus}
        onCheckForUpdates={onCheckForUpdates}
        onInstallUpdate={onInstallUpdate}
      />
      <div className="settings-title">Ekstra</div>
      <BinaryRow
        name="yt-dlp"
        loading={binariesLoading}
        installed={binaries.ytdlp}
        version={binaries.version}
        installing={installing.ytdlp}
        progress={installProgress.ytdlp}
        error={installError.ytdlp}
        onInstall={() => onInstall('ytdlp')}
        onUpdate={onUpdate}
      />
      <BinaryRow
        name="ffmpeg"
        loading={binariesLoading}
        installed={binaries.ffmpeg}
        installing={installing.ffmpeg}
        progress={installProgress.ffmpeg}
        error={installError.ffmpeg}
        onInstall={() => onInstall('ffmpeg')}
      />
      <BinaryRow
        name="gallery-dl"
        loading={binariesLoading}
        installed={binaries.gallerydl}
        installing={installing.gallerydl}
        progress={installProgress.gallerydl}
        error={installError.gallerydl}
        onInstall={() => onInstall('gallerydl')}
        onUpdate={() => onInstall('gallerydl')}
      />
    </div>
  )
}
