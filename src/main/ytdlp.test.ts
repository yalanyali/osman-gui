import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseYtdlpStdout } from './ytdlp.js'

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
