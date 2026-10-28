/**
 * Profiles the Table page, the heaviest page to render: every kana as a paper cell, seeded as
 * mastered so all cells are coloured and sealed. Builds the app, serves it, and measures it in
 * Chromium on a desktop and on a phone-sized screen with a 4× slower CPU.
 *
 * Usage:
 *   npx tsx scripts/perf.ts [label]             # build, serve and measure
 *   npx tsx scripts/perf.ts [label] --no-build  # measure the last build
 *
 * Results are printed and appended to perf-results.jsonl.
 */
import { spawn, execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type Page } from '@playwright/test'
import { KANA } from '../src/lib/data/kana.ts'

const args = process.argv.slice(2)
const label = args.find((a) => !a.startsWith('--')) ?? 'run'
const OUT = join(tmpdir(), 'kana-perf-dist')
const PORT = 4199
const URL = `http://localhost:${PORT}/`

const now = Date.now()
const MATURE = {
  due: now + 90 * 86_400_000,
  stability: 90,
  difficulty: 5,
  elapsed_days: 30,
  scheduled_days: 60,
  learning_steps: 0,
  reps: 8,
  lapses: 0,
  state: 2,
  last_review: now - 86_400_000,
}

interface Durations {
  max: number
  total: number
}

/** The longest and total duration of a trace event, in ms. */
function durations(trace: string, name: string): Durations {
  const events = JSON.parse(readFileSync(trace, 'utf8')).traceEvents as {
    ph: string
    name: string
    dur?: number
  }[]
  const ms = events.filter((e) => e.ph === 'X' && e.name === name).map((e) => (e.dur ?? 0) / 1000)
  return {
    max: Math.round(Math.max(0, ...ms)),
    total: Math.round(ms.reduce((a, b) => a + b, 0)),
  }
}

const median = (values: number[]) =>
  Math.round([...values].sort((a, b) => a - b)[Math.floor(values.length / 2)])

/** Milliseconds from running `code` (with `i` in scope) until two frames later. */
async function timeToFrames(page: Page, code: string, i = 0): Promise<number> {
  return page.evaluate(
    ([code, i]) =>
      new Promise<number>((resolve) => {
        const t0 = performance.now()
        new Function('i', code)(i)
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0)))
      }),
    [code, i] as const,
  )
}

async function profile(device: 'desktop' | 'mobile') {
  const browser = await chromium.launch()
  const page = await browser.newPage(
    device === 'desktop'
      ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
      : { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true },
  )
  // tsx names functions with a helper that doesn't exist in the page.
  await page.addInitScript('window.__name = (f) => f')
  await page.goto(URL)
  await page.waitForFunction(() => localStorage.getItem('kana:save'))
  const ids = KANA.map((k) => k.id)
  await page.evaluate(
    ({ ids, card }) => {
      const save = JSON.parse(localStorage.getItem('kana:save')!)
      for (const deck of ['hiragana', 'katakana', 'combined'])
        save.cards[deck] = Object.fromEntries(ids.map((id) => [id, card]))
      save.settings.tableMastery = true
      // Written before the app starts on reload, so its own save on leaving can't overwrite it.
      sessionStorage.setItem('seed', JSON.stringify(save))
    },
    { ids, card: MATURE },
  )
  await page.addInitScript(() => {
    const seed = sessionStorage.getItem('seed')
    if (seed) localStorage.setItem('kana:save', seed)
    sessionStorage.removeItem('seed')
  })
  await page.reload()
  // Let the paper textures and the photo arrive.
  await page.waitForTimeout(2500)
  const cdp = await page.context().newCDPSession(page)
  if (device === 'mobile') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  // Load the Table chunk once, so the runs measure rendering rather than the network.
  await page.evaluate(() => (location.hash = '#/table'))
  await page.waitForTimeout(1500)

  const trace = join(OUT, `trace-${device}.json`)
  await browser.startTracing(page, {
    path: trace,
    categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'],
  })
  const open: number[] = []
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => (location.hash = '#/'))
    await page.waitForTimeout(500)
    open.push(
      await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const t0 = performance.now()
            location.hash = '#/table'
            const check = () =>
              document.querySelectorAll('.cell.washi').length > 100
                ? requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve(performance.now() - t0)),
                  )
                : requestAnimationFrame(check)
            check()
          }),
      ),
    )
  }
  const clicks: number[] = []
  for (let i = 0; i < 5; i++) {
    clicks.push(
      await timeToFrames(page, "document.querySelectorAll('.cell.washi')[i * 7].click()", i),
    )
    await page.waitForTimeout(150)
  }
  const toggles: number[] = []
  for (let i = 0; i < 4; i++) {
    toggles.push(await timeToFrames(page, "document.querySelector('.controls input').click()"))
    await page.waitForTimeout(150)
  }
  await browser.stopTracing()
  await browser.close()
  return {
    openMs: median(open),
    clickMs: median(clicks),
    toggleMs: median(toggles),
    styleRecalc: durations(trace, 'UpdateLayoutTree'),
    layout: durations(trace, 'Layout'),
    paint: durations(trace, 'Paint'),
  }
}

if (!args.includes('--no-build')) {
  execFileSync('npx', ['vite', 'build', '--outDir', OUT, '--emptyOutDir', '--logLevel', 'warn'], {
    stdio: 'inherit',
  })
}
const server = spawn(
  'npx',
  ['vite', 'preview', '--outDir', OUT, '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore', detached: true },
)
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(URL)).ok) break
    } catch {
      if (i > 50) throw new Error('The preview server did not start')
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  const result = {
    label,
    date: new Date().toISOString(),
    desktop: await profile('desktop'),
    mobile: await profile('mobile'),
  }
  console.log(JSON.stringify(result, null, 2))
  appendFileSync('perf-results.jsonl', JSON.stringify(result) + '\n')
} finally {
  process.kill(-server.pid!)
  rmSync(join(OUT, 'trace-desktop.json'), { force: true })
  rmSync(join(OUT, 'trace-mobile.json'), { force: true })
}
