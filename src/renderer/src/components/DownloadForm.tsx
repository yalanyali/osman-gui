import React from 'react'

function displayPath(p: string): string {
  if (!p) return ''
  const homeMatch = p.match(/^\/Users\/[^/]+/)
  const s = homeMatch ? '~' + p.slice(homeMatch[0].length) : p
  if (s.length <= 36) return s
  const parts = s.split('/')
  return parts.length > 3
    ? parts.slice(0, 2).join('/') + '/…/' + parts[parts.length - 1]
    : s
}

interface DownloadFormProps {
  url: string
  setUrl: (url: string) => void
  format: string
  setFormat: (format: string) => void
  outputDir: string
  onSelectFolder: () => void
  onDownload: () => void
  onCancel: () => void
  dlState: string
  canDownload: boolean
}

export default function DownloadForm({
  url, setUrl, format, setFormat,
  outputDir, onSelectFolder,
  onDownload, onCancel,
  dlState, canDownload,
}: DownloadFormProps) {
  const downloading = dlState === 'downloading'

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canDownload) onDownload()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (text) {
      setUrl(text)
      e.preventDefault()
    }
  }

  return (
    <div className="download-form">
      <div className="field">
        <label className="label">Link</label>
        <input
          className="input"
          type="url"
          placeholder="YouTube veya başka bir site linki yapıştırın…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={downloading}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      <div className="field row">
        <span className="label">Format</span>
        <div className="segment">
          <button
            className={`segment-btn ${format === 'video' ? 'active' : ''}`}
            onClick={() => setFormat('video')}
            disabled={downloading}
          >
            Video
          </button>
          <button
            className={`segment-btn ${format === 'audio' ? 'active' : ''}`}
            onClick={() => setFormat('audio')}
            disabled={downloading}
          >
            Müzik (MP3)
          </button>
        </div>
      </div>

      <div className="field row">
        <span className="label">Klasör</span>
        <button
          className="folder-display"
          onClick={onSelectFolder}
          disabled={downloading}
          title={outputDir}
        >
          {displayPath(outputDir) || 'Klasör seç…'}
        </button>
      </div>

      <div className="actions">
        {downloading ? (
          <button className="btn btn-cancel" onClick={onCancel}>
            İptal
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onDownload}
            disabled={!canDownload}
          >
            İndir
          </button>
        )}
      </div>
    </div>
  )
}
