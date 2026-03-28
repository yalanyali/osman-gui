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

  currentProcess = spawnYtDlp({ url, format, outputDir, binDir })
  let outputFile: string | null = null
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
    if (/unsupported url/i.test(text)) unsupportedUrl = true
    const errMatch = text.match(/ERROR: (.+)/)
    if (errMatch) onProgress({ status: `Error: ${errMatch[1]}` })
  })

  currentProcess.on('close', (code) => {
    currentProcess = null
    if (code === 0) {
      onDone({ outputDir, filename: outputFile })
    } else if (code !== null) {
      if (unsupportedUrl && existsSync(gallerydlPath)) {
        runGalleryDl({ url, format, outputDir, binDir }, onProgress, onDone, onError)
        return
      }
      onError({ message: `yt-dlp exited with code ${code}` })
    }
  })

  currentProcess.on('error', (err) => {
    currentProcess = null
    onError({ message: err.message })
  })
}

export function cancelDownload(): void {
  if (currentProcess) {
    currentProcess.kill('SIGTERM')
    currentProcess = null
  }
}
