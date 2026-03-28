import React from 'react'

function displayPath(p) {
  if (!p) return ''
  const homeMatch = p.match(/^\/Users\/[^/]+/)
  const s = homeMatch ? '~' + p.slice(homeMatch[0].length) : p
  if (s.length <= 36) return s
  const parts = s.split('/')
  return parts.length > 3
    ? parts.slice(0, 2).join('/') + '/…/' + parts[parts.length - 1]
    : s
}

export default function DownloadForm({
  url, setUrl, format, setFormat,
  outputDir, onSelectFolder,
  onDownload, onCancel,
  dlState, canDownload,
}) {
  const downloading = dlState === 'downloading'

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text')
    if (text) {
      setUrl(text)
      e.preventDefault()
    }
  }

  return (
    <div className="download-form">
      <div className="field">
        <label className="label">URL</label>
        <input
          className="input"
          type="url"
          placeholder="https://youtube.com/watch?v=…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
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
            Audio (MP3)
          </button>
        </div>
      </div>

      <div className="field row">
        <span className="label">Save to</span>
        <button
          className="folder-display"
          onClick={onSelectFolder}
          disabled={downloading}
          title={outputDir}
        >
          {displayPath(outputDir) || 'Select folder…'}
        </button>
      </div>

      <div className="actions">
        {downloading ? (
          <button className="btn btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onDownload}
            disabled={!canDownload}
          >
            Download
          </button>
        )}
      </div>
    </div>
  )
}
