import { existsSync, mkdirSync, createWriteStream, chmodSync, unlinkSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'
import https from 'https'
import http from 'http'


export interface BinaryStatus {
  ytdlp: boolean
  ffmpeg: boolean
  version: string | null
}

function getBinDir(userData: string): string {
  const dir = join(userData, 'bin')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function checkBinaries(userData: string): BinaryStatus {
  const binDir = getBinDir(userData)
  const ytdlpPath = join(binDir, 'yt-dlp')
  const ffmpegPath = join(binDir, 'ffmpeg')

  const ytdlp = existsSync(ytdlpPath)
  const ffmpeg = existsSync(ffmpegPath)

  return { ytdlp, ffmpeg, version: null }
}

function downloadFile(url: string, dest: string, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (url: string): void => {
      const mod = url.startsWith('https') ? https : http
      mod.get(url, { headers: { 'User-Agent': 'osman-app/1.0' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode!)) {
          return follow(res.headers.location as string)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode}`))
        }

        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let received = 0
        const file = createWriteStream(dest)

        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          if (total > 0) onProgress?.(Math.round((received / total) * 100))
          file.write(chunk)
        })

        res.on('end', () => file.end(() => resolve()))
        res.on('error', (err) => { file.destroy(); reject(err) })
        file.on('error', reject)
      }).on('error', reject)
    }
    follow(url)
  })
}

function fetchJson<T = unknown>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'osman-app/1.0' } }, (res) => {
      if ([301, 302, 303].includes(res.statusCode!)) {
        return resolve(fetchJson(res.headers.location as string))
      }
      let data = ''
      res.on('data', (c: string) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

export async function installYtDlp(userData: string, onProgress?: (pct: number) => void): Promise<void> {
  const binDir = getBinDir(userData)
  const dest = join(binDir, 'yt-dlp')
  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
  await downloadFile(url, dest, onProgress)
  chmodSync(dest, 0o755)
}


export async function installFfmpeg(userData: string, onProgress?: (pct: number) => void): Promise<void> {
  const binDir = getBinDir(userData)
  const zipDest = join(binDir, 'ffmpeg.zip')

  let zipUrl: string
  try {
    const info = await fetchJson<{ download: { zip: { url: string } } }>('https://evermeet.cx/ffmpeg/info/ffmpeg/release')
    zipUrl = info.download.zip.url
    if (!zipUrl) throw new Error('No zip URL in response')
  } catch (err) {
    throw new Error(`Failed to fetch ffmpeg info: ${(err as Error).message}`)
  }

  await downloadFile(zipUrl, zipDest, onProgress)

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('unzip', ['-o', zipDest, 'ffmpeg', '-d', binDir])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`unzip exited with code ${code}`))
    })
    proc.on('error', reject)
  })

  chmodSync(join(binDir, 'ffmpeg'), 0o755)

  try { unlinkSync(zipDest) } catch {}
}
