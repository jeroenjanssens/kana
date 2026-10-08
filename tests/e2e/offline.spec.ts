import { expect, test } from '@playwright/test'

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    return reg.active?.state
  })
  // Wait until the service worker controls the page and has finished precaching.
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hiragana' })).toBeVisible()
  await page.goto('./#/table')
  await expect(page.getByRole('heading', { name: 'Kana table' })).toBeVisible()
  // Pronunciation audio is available offline too.
  const ok = await page.evaluate(async () => (await fetch('audio/female/shi.mp3')).ok)
  expect(ok).toBe(true)
})

test('pronunciation files decode as audio', async ({ page }) => {
  await page.goto('./')
  const durations = await page.evaluate(async () => {
    const ctx = new AudioContext()
    const out: number[] = []
    const files = ['a', 'shi', 'tsu', 'n', 'pa', 'kya'].flatMap((id) =>
      ['female', 'male'].map((voice) => `audio/${voice}/${id}.mp3`),
    )
    for (const file of [...files, 'audio/female/words/000.mp3', 'audio/male/words/391.mp3']) {
      const data = await (await fetch(file)).arrayBuffer()
      out.push((await ctx.decodeAudioData(data)).duration)
    }
    return out
  })
  for (const d of durations) {
    expect(d).toBeGreaterThan(0.15)
    expect(d).toBeLessThan(2.5)
  }
})

test('the web app manifest is valid', async ({ page }) => {
  const res = await page.request.get('./manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest).toMatchObject({ short_name: 'kana', start_url: '/kana/', display: 'standalone' })
  expect(manifest.icons.length).toBeGreaterThanOrEqual(4)
})
