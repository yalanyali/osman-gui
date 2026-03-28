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
  onProgress({ status: 'Retrying with gallery-dl…', percent: 0 })

  currentProcess = spawnGalleryDl({ url, outputDir, binDir })
  let outputFile: string | null = null

  currentProcess.stdout!.on('data', (data: Buffer) => {
    const parsed = parseGalleryDlStdout(data.toString())
    if (parsed.filename) {
      outputFile = parsed.filename
      onProgress({ filename: parsed.filename, percent: 50 })
    }
  })

  currentProcess.stderr!.on('data', (data: Buffer) => {
    const errMatch = data.toString().match(/\[error\] (.+)/)
    if (errMatch) onProgress({ status: `Error: ${errMatch[1]}` })
  })

  currentProcess.on('close', (code) => {
    currentProcess = null
    if (code === 0) {
      onDone({ outputDir, filename: outputFile })
    } else if (code !== null) {
      onError({ message: `gallery-dl exited with code ${code}` })
    }
  })

  currentProcess.on('error', (err) => {
    currentProcess = null
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
  const { url, outputDir, binDir } = args

  currentProcess = spawnYtDlp(args)
  let outputFile: string | null = null
  let ageRestricted = false
  let unsupportedUrl = false

  currentProcess.stdout!.on('data', (data: Buffer) => {
    const parsed = parseYtdlpStdout(data.toString())
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
    if (/sign in|confirm your age|age.?restrict/i.test(text)) ageRestricted = true
    if (/unsupported url/i.test(text)) unsupportedUrl = true
    const errMatch = text.match(/ERROR: (.+)/)
    if (errMatch) onProgress({ status: `Error: ${errMatch[1]}` })
  })

  currentProcess.on('close', (code) => {
    currentProcess = null
    if (code === 0) {
      onDone({ outputDir, filename: outputFile })
    } else if (code !== null) {
      if (ageRestricted) {
        onAgeRestricted()
      } else if (unsupportedUrl) {
        onUnsupportedUrl()
      } else {
        onError({ message: `yt-dlp exited with code ${code}` })
      }
    }
  })

  currentProcess.on('error', (err) => {
    currentProcess = null
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

  if (!existsSync(ytdlpPath)) {
    runGalleryDl({ url, format, outputDir, binDir }, onProgress, onDone, onError)
    return
  }

  const tryWithSafari = () => {
    onProgress({ status: 'Yaş doğrulaması için deneniyor…', percent: 0 })
    runYtDlp(
      { url, format, outputDir, binDir, browser: 'safari' },
      onProgress, onDone, onError,
      () => onError({ message: 'yt-dlp exited with code 1' }),
      () => existsSync(gallerydlPath)
        ? runGalleryDl({ url, format, outputDir, binDir }, onProgress, onDone, onError)
        : onError({ message: 'yt-dlp exited with code 1' }),
    )
  }

  const tryWithChrome = () => {
    onProgress({ status: 'Yaş doğrulaması için deneniyor…', percent: 0 })
    runYtDlp(
      { url, format, outputDir, binDir, browser: 'chrome' },
      onProgress, onDone, onError,
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
    currentProcess.kill('SIGTERM')
    currentProcess = null
  }
}
