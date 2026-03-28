import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'

export interface GalleryDlParseResult {
  filename?: string
}

export function parseGalleryDlStdout(text: string): GalleryDlParseResult {
  const result: GalleryDlParseResult = {}
  const fileMatch = text.match(/^# (.+)$/m)
  if (fileMatch) result.filename = fileMatch[1].trim().split('/').pop()
  return result
}

interface SpawnGalleryDlArgs {
  url: string
  outputDir: string
  binDir: string
  browser?: string
}

export function spawnGalleryDl({ url, outputDir, binDir, browser }: SpawnGalleryDlArgs): ChildProcess {
  const gallerydlPath = join(binDir, 'gallery-dl')
  const args = ['-d', outputDir]
  if (browser) args.push('--cookies-from-browser', browser)
  args.push(url)
  return spawn(gallerydlPath, args, { cwd: outputDir })
}
