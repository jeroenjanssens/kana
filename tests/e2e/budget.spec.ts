import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { expect, test } from '@playwright/test'

/** The JavaScript a first visit loads: the entry script and its modulepreloads (dist is built by the web server). */
function firstLoadScripts(): string[] {
  const html = readFileSync('dist/index.html', 'utf8')
  return [...html.matchAll(/(?:src|href)="\/kana\/(assets\/[^"]+\.js)"/g)].map(
    (m) => `dist/${m[1]}`,
  )
}

test('the first visit loads at most 60 KB of gzipped JavaScript', ({ isMobile }) => {
  test.skip(isMobile, 'same build')
  const size = firstLoadScripts().reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0)
  expect(size).toBeLessThan(60 * 1024)
})

test('the FSRS algorithm is not part of the first load', ({ isMobile }) => {
  test.skip(isMobile, 'same build')
  for (const file of firstLoadScripts()) {
    expect(readFileSync(file, 'utf8'), file).not.toContain('request_retention')
  }
})
