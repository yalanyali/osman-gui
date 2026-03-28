import React from 'react'

export default function ProgressBar({
  dlState, progress, filename, statusMsg,
  outputDir, onOpenFolder, onReset,
}) {
  const downloading = dlState === 'downloading'
  const done = dlState === 'done'
  const error = dlState === 'error'

  let label = ''
  if (done) label = '✓ Done'
  else if (error) label = '✗ Failed'
  else if (statusMsg) label = statusMsg
  else if (filename) label = filename
  else label = 'Starting…'

  return (
    <div className={`progress-section ${dlState}`}>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>

      <div className="progress-info">
        <span className="progress-label" title={filename}>{label}</span>
        {downloading && (
          <span className="progress-pct">{Math.round(progress)}%</span>
        )}
      </div>

      {error && statusMsg && (
        <div className="progress-error">{statusMsg}</div>
      )}

      <div className="progress-actions">
        {done && (
          <button className="link-btn" onClick={onOpenFolder}>
            Open Folder
          </button>
        )}
        {(done || error) && (
          <button className="link-btn" onClick={onReset}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
