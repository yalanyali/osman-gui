import React from 'react'

function BinaryRow({ name, installed, version, installing, progress, error, onInstall, onUpdate }) {
  return (
    <div className="binary-row">
      <div className="binary-info">
        <span className="binary-name">{name}</span>
        {installed ? (
          <span className="binary-status ok">{version || 'installed'}</span>
        ) : (
          <span className="binary-status missing">not installed</span>
        )}
      </div>
      <div className="binary-actions">
        {installing ? (
          <span className="binary-progress">{progress}%</span>
        ) : installed ? (
          onUpdate && (
            <button className="link-btn" onClick={onUpdate}>
              Update
            </button>
          )
        ) : (
          <button className="link-btn" onClick={onInstall}>
            Install
          </button>
        )}
      </div>
      {error && <div className="binary-error">{error}</div>}
    </div>
  )
}

function AppUpdateRow({ appVersion, updateStatus, onCheckForUpdates, onInstallUpdate }) {
  const isDownloading = updateStatus?.status === 'downloading'

  let statusEl = null
  if (updateStatus?.status === 'available') {
    statusEl = <span className="binary-status">v{updateStatus.version} available</span>
  } else if (isDownloading) {
    statusEl = <span className="binary-status">{updateStatus.percent}%</span>
  } else if (updateStatus?.status === 'ready') {
    statusEl = <span className="binary-status ok">ready to install</span>
  } else if (updateStatus?.status === 'error') {
    statusEl = <span className="binary-status missing">update error</span>
  }

  let actionEl = null
  if (updateStatus?.status === 'ready') {
    actionEl = (
      <button className="link-btn" onClick={onInstallUpdate}>
        Restart
      </button>
    )
  } else if (!isDownloading) {
    actionEl = (
      <button className="link-btn" onClick={onCheckForUpdates}>
        Check
      </button>
    )
  }

  return (
    <div className="binary-row">
      <div className="binary-info">
        <span className="binary-name">yt-dlp GUI</span>
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

export default function BinaryManager({
  binaries, installing, installProgress, installError, onInstall, onUpdate,
  appVersion, updateStatus, onCheckForUpdates, onInstallUpdate,
}) {
  return (
    <div className="settings-panel">
      <div className="settings-title">App</div>
      <AppUpdateRow
        appVersion={appVersion}
        updateStatus={updateStatus}
        onCheckForUpdates={onCheckForUpdates}
        onInstallUpdate={onInstallUpdate}
      />
      <div className="settings-title">Dependencies</div>
      <BinaryRow
        name="yt-dlp"
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
        installed={binaries.ffmpeg}
        installing={installing.ffmpeg}
        progress={installProgress.ffmpeg}
        error={installError.ffmpeg}
        onInstall={() => onInstall('ffmpeg')}
      />
    </div>
  )
}
