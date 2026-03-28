import { ChildProcess } from 'child_process'
import { parseYtdlpStdout, spawnYtDlp } from './ytdlp.js'

let currentProcess: ChildProcess | null = null

interface DownloadArgs {
  url: string
  format: string
  outputDir: string
  binDir: string
}

interface ProgressData {
  status?: string
  percent?: number
  filename?: string
}

interface DoneData {
  outputDir: string
  filename: string | null
}

interface ErrorData {
  message: string
}

function runYtDlp(
  args: DownloadArgs & { browser?: string },
  onProgress: (data: ProgressData) => void,
  onDone: (data: DoneData) => void,
  onError: (data: ErrorData) => void,
  onAgeRestricted: () => void,
  onFallback: () => void,
): void {
  const { url, outputDir } = args
  console.log('[downloader] starting yt-dlp for:', url, args.browser ? `(browser: ${args.browser})` : '(no cookies)')

  currentProcess = spawnYtDlp(args)
  let outputFile: string | null = null
  let ageRestricted = false

  currentProcess.stdout!.on('data', (data: Buffer) => {
    const text = data.toString()
    console.log('[yt-dlp stdout]', text.trim())
    const parsed = parseYtdlpStdout(text)
    if (parsed.percent !== undefined) onProgress({ percent: parsed.percent })
    if (parsed.filename) {
      outputFile = parsed.filename
      onProgress({ filename: parsed.filename })
    }
    if (parsed.mergeFilename) {
      outputFile = parsed.mergeFilename
      onProgress({ filename: parsed.mergeFilename, status: parsed.mergeStatus })
    }
  })

  currentProcess.stderr!.on('data', (data: Buffer) => {
    const text = data.toString()
    console.error('[yt-dlp stderr]', text.trim())
    if (/sign in|confirm your age|age.?restrict/i.test(text)) {
      console.warn('[yt-dlp] age restriction detected')
      ageRestricted = true
    }
    const errMatch = text.match(/ERROR: (.+)/)
    if (errMatch) onProgress({ status: `Error: ${errMatch[1]}` })
  })

  currentProcess.on('close', (code) => {
    currentProcess = null
    console.log('[yt-dlp] exited with code', code, '| ageRestricted:', ageRestricted)
    if (code === 0) {
      onDone({ outputDir, filename: outputFile })
    } else if (code !== null) {
      if (ageRestricted) {
        console.log('[downloader] retrying due to age restriction')
        onAgeRestricted()
      } else {
        onFallback()
      }
    }
  })

  currentProcess.on('error', (err) => {
    currentProcess = null
    console.error('[yt-dlp] spawn error:', err.message)
    onError({ message: err.message })
  })
}

export function startDownload(
  { url, format, outputDir, binDir }: DownloadArgs,
  onProgress: (data: ProgressData) => void,
  onDone: (data: DoneData) => void,
  onError: (data: ErrorData) => void,
): void {
  console.log('[downloader] startDownload', { url, format, outputDir, binDir })

  const tryWithChrome = () => {
    console.log('[downloader] trying with Chrome cookies')
    onProgress({ status: 'Yaş doğrulaması için deneniyor…', percent: 0 })
    runYtDlp(
      { url, format, outputDir, binDir, browser: 'chrome' },
      onProgress, onDone, onError,
      () => onError({ message: 'yt-dlp exited with code 1' }),
      () => onError({ message: 'yt-dlp failed' }),
    )
  }

  runYtDlp(
    { url, format, outputDir, binDir },
    onProgress, onDone, onError,
    tryWithChrome,
    () => onError({ message: 'yt-dlp failed' }),
  )
}

export function cancelDownload(): void {
  if (currentProcess) {
    console.log('[downloader] cancelling current process')
    currentProcess.kill('SIGTERM')
    currentProcess = null
  }
}
