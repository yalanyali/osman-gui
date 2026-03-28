import { spawn } from 'child_process'
import { join } from 'path'

let currentProcess = null

export function startDownload({ url, format, outputDir, binDir }, onProgress, onDone, onError) {
  const ytdlpPath = join(binDir, 'yt-dlp')

  const args = [
    '--newline',
    '--ffmpeg-location', binDir,
    '-o', '%(title)s.%(ext)s',
  ]

  if (format === 'audio') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0')
  } else {
    args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b')
  }

  args.push(url)

  currentProcess = spawn(ytdlpPath, args, { cwd: outputDir })

  let outputFile = null

  currentProcess.stdout.on('data', (data) => {
    const text = data.toString()

    const pctMatch = text.match(/\[download\]\s+([\d.]+)%/)
    if (pctMatch) {
      onProgress({ percent: parseFloat(pctMatch[1]) })
    }

    const destMatch = text.match(/\[download\] Destination: (.+)/)
    if (destMatch) {
      outputFile = destMatch[1].trim()
      onProgress({ filename: outputFile.split('/').pop() })
    }

    const mergeMatch = text.match(/\[Merger\] Merging formats into "(.+)"/)
    if (mergeMatch) {
      outputFile = mergeMatch[1].trim()
      onProgress({ filename: outputFile.split('/').pop(), status: 'Merging…' })
    }
  })

  currentProcess.stderr.on('data', (data) => {
    const text = data.toString()
    const errMatch = text.match(/ERROR: (.+)/)
    if (errMatch) {
      onProgress({ status: `Error: ${errMatch[1]}` })
    }
  })

  currentProcess.on('close', (code) => {
    currentProcess = null
    if (code === 0) {
      onDone({ outputDir, filename: outputFile })
    } else if (code !== null) {
      // non-null, non-zero = error (null = killed/cancelled)
      onError({ message: `yt-dlp exited with code ${code}` })
    }
  })

  currentProcess.on('error', (err) => {
    currentProcess = null
    onError({ message: err.message })
  })
}

export function cancelDownload() {
  if (currentProcess) {
    currentProcess.kill('SIGTERM')
    currentProcess = null
  }
}
