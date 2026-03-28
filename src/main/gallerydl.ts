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
}

export function spawnGalleryDl({ url, outputDir, binDir }: SpawnGalleryDlArgs): ChildProcess {
  const gallerydlPath = join(binDir, 'gallery-dl')
  return spawn(gallerydlPath, ['-d', outputDir, url], { cwd: outputDir })
}
