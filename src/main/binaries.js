import { existsSync, mkdirSync, createWriteStream, chmodSync, unlinkSync } from 'fs'
import { join } from 'path'
import { spawn, execFile } from 'child_process'
import { promisify } from 'util'
import https from 'https'
import http from 'http'

const execFileAsync = promisify(execFile)

function getBinDir(userData) {
  const dir = join(userData, 'bin')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export async function checkBinaries(userData) {
  const binDir = getBinDir(userData)
  const ytdlpPath = join(binDir, 'yt-dlp')
  const ffmpegPath = join(binDir, 'ffmpeg')

  const ytdlp = existsSync(ytdlpPath)
  const ffmpeg = existsSync(ffmpegPath)

  let version = null
  if (ytdlp) {
    try {
      const { stdout } = await execFileAsync(ytdlpPath, ['--version'])
      version = stdout.trim()
    } catch {}
  }

  return { ytdlp, ffmpeg, version }
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const follow = (url) => {
      const mod = url.startsWith('https') ? https : http
      mod.get(url, { headers: { 'User-Agent': 'yt-dlp-gui/1.0' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          return follow(res.headers.location)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode}`))
        }

        const total = parseInt(res.headers['content-length'] || '0', 10)
        let received = 0
        const file = createWriteStream(dest)

        res.on('data', (chunk) => {
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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'yt-dlp-gui/1.0' } }, (res) => {
      if ([301, 302, 303].includes(res.statusCode)) {
        return resolve(fetchJson(res.headers.location))
      }
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

export async function installYtDlp(userData, onProgress) {
  const binDir = getBinDir(userData)
  const dest = join(binDir, 'yt-dlp')
  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
  await downloadFile(url, dest, onProgress)
  chmodSync(dest, 0o755)
}

export async function installFfmpeg(userData, onProgress) {
  const binDir = getBinDir(userData)
  const zipDest = join(binDir, 'ffmpeg.zip')

  let zipUrl
  try {
    const info = await fetchJson('https://evermeet.cx/ffmpeg/info/ffmpeg/release')
    zipUrl = info.download.zip.url
    if (!zipUrl) throw new Error('No zip URL in response')
  } catch (err) {
    throw new Error(`Failed to fetch ffmpeg info: ${err.message}`)
  }

  await downloadFile(zipUrl, zipDest, onProgress)

  await new Promise((resolve, reject) => {
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
