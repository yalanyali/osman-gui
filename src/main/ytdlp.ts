import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'

export interface YtdlpParseResult {
  percent?: number
  filename?: string
  mergeFilename?: string
  mergeStatus?: string
}

export function parseYtdlpStdout(text: string): YtdlpParseResult {
  const result: YtdlpParseResult = {}

  const pctMatch = text.match(/\[download\]\s+([\d.]+)%/)
  if (pctMatch) result.percent = parseFloat(pctMatch[1])

  const destMatch = text.match(/\[download\] Destination: (.+)/)
  if (destMatch) result.filename = destMatch[1].trim().split('/').pop()

  const mergeMatch = text.match(/\[Merger\] Merging formats into "(.+)"/)
  if (mergeMatch) {
    result.mergeFilename = mergeMatch[1].trim().split('/').pop()
    result.mergeStatus = 'Merging…'
  }

  return result
}

interface SpawnYtDlpArgs {
  url: string
  format: string
  outputDir: string
  binDir: string
  browser?: string
}

export function spawnYtDlp({ url, format, outputDir, binDir, browser }: SpawnYtDlpArgs): ChildProcess {
  const ytdlpPath = join(binDir, 'yt-dlp')

  const args = [
    '--newline',
    '--ffmpeg-location', binDir,
    '-o', '%(title)s.%(ext)s',
    '--extractor-args', 'youtube:player_client=tv_embedded,web',
  ]

  if (browser) {
    args.push('--cookies-from-browser', browser)
  }

  if (format === 'audio') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0')
  } else {
    args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b')
  }

  args.push(url)

  return spawn(ytdlpPath, args, { cwd: outputDir })
}
