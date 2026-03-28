import { join } from 'path'
import { existsSync } from 'fs'
import { ChildProcess } from 'child_process'
import { parseYtdlpStdout, spawnYtDlp } from './ytdlp.js'
import { parseGalleryDlStdout, spawnGalleryDl } from './gallerydl.js'

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

function runGalleryDl(
  { url, outputDir, binDir }: DownloadArgs,
  onProgress: (data: ProgressData) => void,
  onDone: (data: DoneData) => void,
  onError: (data: ErrorData) => void,
): void {
  console.log('[downloader] starting gallery-dl for:', url)
  onProgress({ status: 'Retrying with gallery-dl…', percent: 0 })

  currentProcess = spawnGalleryDl({ url, outputDir, binDir })
  let outputFile: string | null = null

  currentProcess.stdout!.on('data', (data: Buffer) => {
    const text = data.toString()
    console.log('[gallery-dl stdout]', text.trim())
    const parsed = parseGalleryDlStdout(text)
    if (parsed.filename) {
      outputFile = parsed.filename
      onProgress({ filename: parsed.filename, percent: 50 })
    }
  })

  currentProcess.stderr!.on('data', (data: Buffer) => {
    const text = data.toString()
    console.error('[gallery-dl stderr]', text.trim())
    const errMatch = text.match(/\[error\] (.+)/)
    if (errMatch) onProgress({ status: `Error: ${errMatch[1]}` })
  })

  currentProcess.on('close', (code) => {
    currentProcess = null
    console.log('[gallery-dl] exited with code', code)
    if (code === 0) {
      onDone({ outputDir, filename: outputFile })
    } else if (code !== null) {
      onError({ message: `gallery-dl exited with code ${code}` })
    }
  })

  currentProcess.on('error', (err) => {
    currentProcess = null
    console.error('[gallery-dl] spawn error:', err.message)
    onError({ message: err.message })
  })
}

function runYtDlp(
  args: DownloadArgs & { browser?: string },
  onProgress: (data: ProgressData) => void,
  onDone: (data: DoneData) => void,
  onError: (data: ErrorData) => void,
  onAgeRestricted: () => void,
  onUnsupportedUrl: () => void,
): void {
  const { url, outputDir, binDir, browser } = args
  console.log('[downloader] starting yt-dlp for:', url, browser ? `(browser: ${browser})` : '(no cookies)')

  currentProcess = spawnYtDlp(args)
  let outputFile: string | null = null
  let ageRestricted = false
  let unsupportedUrl = false

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
    if (/unsupported url/i.test(text)) {
      console.warn('[yt-dlp] unsupported URL detected')
      unsupportedUrl = true
    }
    const errMatch = text.match(/ERROR: (.+)/)
    if (errMatch) onProgress({ status: `Error: ${errMatch[1]}` })
  })

  currentProcess.on('close', (code) => {
    currentProcess = null
    console.log('[yt-dlp] exited with code', code, '| ageRestricted:', ageRestricted, '| unsupportedUrl:', unsupportedUrl)
    if (code === 0) {
      onDone({ outputDir, filename: outputFile })
    } else if (code !== null) {
      if (ageRestricted) {
        console.log('[downloader] retrying due to age restriction')
        onAgeRestricted()
      } else if (unsupportedUrl) {
        console.log('[downloader] unsupported URL, trying fallback')
        onUnsupportedUrl()
      } else {
        onError({ message: `yt-dlp exited with code ${code}` })
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
  const ytdlpPath = join(binDir, 'yt-dlp')
  const gallerydlPath = join(binDir, 'gallery-dl')
  console.log('[downloader] startDownload', { url, format, outputDir, binDir })
  console.log('[downloader] yt-dlp exists:', existsSync(ytdlpPath), '| gallery-dl exists:', existsSync(gallerydlPath))

  if (!existsSync(ytdlpPath)) {
    console.log('[downloader] yt-dlp not found, using gallery-dl directly')
    runGalleryDl({ url, format, outputDir, binDir }, onProgress, onDone, onError)
    return
  }

  const tryWithSafari = () => {
    console.log('[downloader] trying with Safari cookies')
    onProgress({ status: 'Yaş doğrulaması için deneniyor…', percent: 0 })
    runYtDlp(
      { url, format, outputDir, binDir, browser: 'safari' },
      onProgress, onDone, onError,
      () => {
        console.error('[downloader] Safari cookies also age-restricted, giving up')
        onError({ message: 'yt-dlp exited with code 1' })
      },
      () => existsSync(gallerydlPath)
        ? runGalleryDl({ url, format, outputDir, binDir }, onProgress, onDone, onError)
        : onError({ message: 'yt-dlp exited with code 1' }),
    )
  }

  const tryWithChrome = () => {
    console.log('[downloader] trying with Chrome cookies')
    onProgress({ status: 'Yaş doğrulaması için deneniyor…', percent: 0 })
    runYtDlp(
      { url, format, outputDir, binDir, browser: 'chrome' },
      onProgress, onDone, tryWithSafari,
      tryWithSafari,
      () => existsSync(gallerydlPath)
        ? runGalleryDl({ url, format, outputDir, binDir }, onProgress, onDone, onError)
        : onError({ message: 'yt-dlp exited with code 1' }),
    )
  }

  runYtDlp(
    { url, format, outputDir, binDir },
    onProgress, onDone, onError,
    tryWithChrome,
    () => existsSync(gallerydlPath)
      ? runGalleryDl({ url, format, outputDir, binDir }, onProgress, onDone, onError)
      : onError({ message: 'yt-dlp exited with code 1' }),
  )
}

export function cancelDownload(): void {
  if (currentProcess) {
    console.log('[downloader] cancelling current process')
    currentProcess.kill('SIGTERM')
    currentProcess = null
  }
}
