import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseYtdlpStdout } from './ytdlp.js'
import { parseGalleryDlStdout } from './gallerydl.js'

// parseYtdlpStdout

test('parses percent', () => {
  const r = parseYtdlpStdout('[download]  42.3% of 10.00MiB')
  assert.equal(r.percent, 42.3)
})

test('parses destination filename', () => {
  const r = parseYtdlpStdout('[download] Destination: /tmp/My Video.mp4')
  assert.equal(r.filename, 'My Video.mp4')
})

test('parses merger filename and status', () => {
  const r = parseYtdlpStdout('[Merger] Merging formats into "/tmp/My Video.mkv"')
  assert.equal(r.mergeFilename, 'My Video.mkv')
  assert.equal(r.mergeStatus, 'Merging…')
})

test('returns empty object for unrelated text', () => {
  const r = parseYtdlpStdout('[info] some informational message')
  assert.deepEqual(r, {})
})

test('no false positives on gallery-dl output', () => {
  const r = parseYtdlpStdout('# /tmp/gallery-dl/site/image.jpg')
  assert.deepEqual(r, {})
})

// parseGalleryDlStdout

test('parses gallery-dl file line', () => {
  const r = parseGalleryDlStdout('# /home/user/gallery-dl/reddit/post/image.jpg')
  assert.equal(r.filename, 'image.jpg')
})

test('parses gallery-dl file line in multiline output', () => {
  const r = parseGalleryDlStdout('some info\n# /tmp/out/pic.png\nmore info')
  assert.equal(r.filename, 'pic.png')
})

test('returns empty object for non-file lines', () => {
  const r = parseGalleryDlStdout('[info][reddit] Downloading page')
  assert.deepEqual(r, {})
})

test('no false positives on yt-dlp percent line', () => {
  const r = parseGalleryDlStdout('[download]  55.0% of 10.00MiB')
  assert.deepEqual(r, {})
})
