import React from 'react'

interface ProgressBarProps {
  dlState: string
  progress: number
  filename: string
  statusMsg: string
  outputDir: string
  onOpenFolder: () => void
  onReset: () => void
}

export default function ProgressBar({
  dlState, progress, filename, statusMsg,
  outputDir, onOpenFolder, onReset,
}: ProgressBarProps) {
  const downloading = dlState === 'downloading'
  const done = dlState === 'done'
  const error = dlState === 'error'

  let label = ''
  if (done) label = '✓ İndirildi!'
  else if (error) label = 'Bir hata oluştu'
  else if (statusMsg) label = statusMsg
  else if (filename) label = filename
  else label = 'Başlıyor…'

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

      {error && (
        <div className="progress-error">Bir hata oluştu, tekrar deneyin.</div>
      )}

      <div className="progress-actions">
        {done && (
          <button className="btn btn-secondary" onClick={onOpenFolder}>
            Klasörü Aç
          </button>
        )}
        {(done || error) && (
          <button className="btn btn-secondary" onClick={onReset}>
            Kapat
          </button>
        )}
      </div>
    </div>
  )
}
