import { expect, test, type Page } from '@playwright/test'

async function mainWidth(page: Page) {
  return page.locator('main').evaluate((m) => m.getBoundingClientRect().width)
}

test('the page width is the same on short and long pages', async ({ page }) => {
  await page.goto('./#/practice')
  await expect(page.getByRole('heading', { name: 'Practice', exact: true })).toBeVisible()
  const short = await mainWidth(page)
  await page.goto('./#/table')
  await expect(page.getByRole('heading', { name: 'Kana table' })).toBeVisible()
  expect(await mainWidth(page)).toBe(short)
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe(
    'scroll',
  )
})

test('detail buttons stay inside the panel, even for wide kana', async ({ page }) => {
  await page.goto('./#/table')
  for (const name of [/^きゃ, kya/, /^か, ka/]) {
    // On phones the details are a bottom sheet; close it before tapping the next kana.
    const close = page.getByRole('button', { name: 'Close details' })
    if (await close.isVisible()) await close.click()
    await page.getByRole('button', { name }).click()
    const panel = await page.locator('.details').boundingBox()
    for (const label of ['Listen', 'Strokes', 'Fonts']) {
      const button = page.locator('.details').getByRole('button', { name: label })
      if (!(await button.count())) continue
      const box = (await button.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(panel!.x)
      expect(box.x + box.width).toBeLessThanOrEqual(panel!.x + panel!.width)
    }
  }
})

test('tile art never wraps onto two lines', async ({ page }) => {
  for (const path of ['./#/practice', './']) {
    await page.goto(path)
    const arts = page.locator('.art, .tile-glyph')
    await expect(arts.first()).toBeVisible()
    for (const art of await arts.all()) {
      const lines = await art.evaluate((el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size
      })
      expect(lines).toBe(1)
    }
  }
})

test('strokes that have not started drawing are invisible', async ({ page }) => {
  await page.goto('./#/table')
  await page.getByRole('button', { name: /^あ, a/ }).click()
  await page.locator('.details').getByRole('button', { name: 'Strokes' }).click()
  const strokes = page.locator('.stroke-order').first().locator('.ink path')
  await expect(strokes).toHaveCount(3)
  // Stroke 3 starts after about 1.6 s; right after opening it must not show (no dot).
  expect(await strokes.nth(2).evaluate((p) => getComputedStyle(p).opacity)).toBe('0')
  await expect.poll(() => strokes.nth(0).evaluate((p) => getComputedStyle(p).opacity)).toBe('1')
  // When the animation has finished, every stroke is visible.
  await expect
    .poll(() => strokes.nth(2).evaluate((p) => getComputedStyle(p).opacity), {
      timeout: 5000,
    })
    .toBe('1')
})
