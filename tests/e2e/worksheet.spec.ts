import { expect, test } from '@playwright/test'
import { savedData, seed, trackErrors } from './helpers'

const summary = (page: import('@playwright/test').Page) => page.getByText(/^\d+ kana · \d+ pages?$/)

test('choose rows and a size, and see the pages', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./#/practice')
  await page.getByRole('link', { name: /Worksheet/ }).click()
  await expect(page.getByRole('heading', { name: 'Worksheet' })).toBeVisible()

  // The first two rows, in table order, on one page.
  await expect(summary(page)).toHaveText('10 kana · 1 page')
  const preview = page.getByRole('region', { name: 'Preview' })
  await expect(preview.locator('.sheet')).toHaveCount(1)
  await expect(preview.locator('.row svg').first()).toHaveAttribute('aria-label', 'あ')
  await expect(preview.locator('.row svg').nth(9)).toHaveAttribute('aria-label', 'こ')
  await expect(preview.locator('.sheet').first()).toHaveAttribute('aria-label', 'Page 1 of 1')

  // Every basic and dakuten row: 71 kana. Rows per page: 21 at Extra small, 18 at Small, 14 at
  // Medium, 12 at Large, 10 at Extra large.
  await page.getByRole('button', { name: 'Select all' }).click()
  await expect(summary(page)).toHaveText('71 kana · 6 pages')
  await expect(page.getByText('Squares of 13 mm, 14 rows per page')).toBeVisible()
  const sizes = page.getByRole('group', { name: 'Size' })
  await sizes.getByRole('button', { name: 'Extra small' }).click()
  await expect(summary(page)).toHaveText('71 kana · 4 pages')
  await expect(preview.locator('.sheet').first().locator('.row')).toHaveCount(21)
  await sizes.getByRole('button', { name: 'Extra large' }).click()
  await expect(summary(page)).toHaveText('71 kana · 8 pages')
  await expect(preview.locator('.sheet').first().locator('.row')).toHaveCount(10)
  await sizes.getByRole('button', { name: 'Small', exact: true }).click()
  await expect(summary(page)).toHaveText('71 kana · 4 pages')
  await expect(preview.locator('.sheet')).toHaveCount(4)
  await expect(preview.locator('.sheet').first().locator('.row')).toHaveCount(18)
  await sizes.getByRole('button', { name: 'Large', exact: true }).click()
  await expect(summary(page)).toHaveText('71 kana · 6 pages')
  await expect(preview.locator('.sheet').first().locator('.row')).toHaveCount(12)

  // Both scripts: every kana twice.
  await page.getByRole('button', { name: 'Both' }).click()
  await expect(summary(page)).toHaveText('142 kana · 12 pages')

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('Choose at least one row.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print' })).toBeDisabled()
  await expect(preview).toHaveCount(0)

  const data = await savedData(page)
  expect(data.settings).toMatchObject({ sheetSize: 'large', sheetScript: 'both', sheetRows: [] })
  errors.check()
})

test('romaji can be left out, in the preview and on paper', async ({ page }) => {
  await page.goto('./#/worksheet')
  const romaji = page.getByRole('region', { name: 'Preview' }).locator('.romaji')
  await expect(romaji.first()).toHaveText('a')
  await page.getByLabel('Show romaji').uncheck()
  await expect(romaji.first()).toHaveText('')
  await expect(page.locator('.worksheet-print .romaji').first()).toHaveText('')
})

test('the grid can be left out: then a line separates the rows', async ({ page }) => {
  await page.goto('./#/worksheet')
  const preview = page.getByRole('region', { name: 'Preview' })
  const row = preview.locator('.row').first()
  const line = () => row.evaluate((el) => getComputedStyle(el).borderBottomStyle)
  await expect(row.locator('.border')).toHaveCount(14)
  await expect(row.locator('.guide')).toHaveCount(14)
  expect(await line()).toBe('none')
  await page.getByLabel('Show grid').uncheck()
  await expect(row.locator('.border, .guide')).toHaveCount(0)
  expect(await line()).toBe('solid')
  await expect(page.locator('.worksheet-print .row').first().locator('.border')).toHaveCount(0)
  // The kana and their traces stay.
  await expect(row.locator('.kana')).toHaveCount(12)
  expect((await savedData(page)).settings.sheetGrid).toBe(false)
})

test('the numbered square can colour each stroke, its dot and its number', async ({ page }) => {
  await page.goto('./#/worksheet')
  const row = page.getByRole('region', { name: 'Preview' }).locator('.row').first()
  const colours = (selector: string, property: 'stroke' | 'fill') =>
    row.locator(selector).evaluateAll((els, p) => els.map((e) => getComputedStyle(e)[p]), property)
  // あ: three strokes, in red, green and blue; the other squares stay as they are.
  const rgb = ['rgb(186, 2, 47)', 'rgb(5, 121, 24)', 'rgb(65, 79, 210)']
  expect(await colours('.kana.numbered path', 'stroke')).toEqual(rgb)
  expect(await colours('.numbers circle', 'fill')).toEqual(rgb)
  expect(await colours('.numbers text', 'fill')).toEqual(rgb)
  expect(new Set(await colours('.glyph', 'fill')).size).toBe(1)

  await page.getByLabel('Colour the strokes').uncheck()
  expect(new Set(await colours('.kana.numbered path', 'stroke')).size).toBe(1)
  expect(await colours('.numbers text', 'fill')).toEqual(Array(3).fill('rgb(199, 62, 29)'))
  expect((await savedData(page)).settings.sheetColours).toBe(false)
})

test('a font for the first square and the traces; the numbered square keeps its strokes', async ({
  page,
}) => {
  await page.goto('./#/worksheet')
  const row = page.getByRole('region', { name: 'Preview' }).locator('.row').first()
  // By default the model and the ten traces are in Klee One (a textbook font); the numbered square
  // is drawn from the stroke-order data.
  await expect(page.getByLabel('Font')).toHaveValue('klee-one')
  await expect(row.locator('.glyph')).toHaveCount(11)
  await expect(row.locator('.glyph').first()).toHaveText('あ')
  await expect(row.locator('.glyph').first()).toHaveAttribute('font-family', /Klee One/)
  await expect(row.locator('.kana.numbered path')).toHaveCount(3)
  await expect(row.locator('.kana:not(.numbered) path')).toHaveCount(0)
  // Every square from the stroke data.
  await page.getByLabel('Font').selectOption('strokes')
  await expect(row.locator('.glyph')).toHaveCount(0)
  await expect(row.locator('.kana:not(.numbered) path')).toHaveCount(33)
  expect((await savedData(page)).settings.sheetFont).toBe('strokes')
  await page.getByLabel('Font').selectOption({ label: 'Shippori Mincho' })
  await expect(row.locator('.glyph').first()).toHaveAttribute('font-family', /Shippori Mincho/)
})

test('random order mixes the kana; shuffle again gives a new order', async ({ page }) => {
  await seed(page, { settings: { sheetRows: ['basic:a', 'basic:k', 'basic:s', 'basic:t'] } })
  await page.goto('./#/worksheet')
  const order = () =>
    page
      .getByRole('region', { name: 'Preview' })
      .locator('.row svg')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).join(''))
  const table = await order()
  expect(table.startsWith('あいうえおかきくけこ')).toBe(true)
  await expect(page.getByRole('button', { name: 'Shuffle again' })).toHaveCount(0)
  await page.getByLabel('Random order').check()
  await expect.poll(order).not.toBe(table)
  const first = await order()
  await page.getByRole('button', { name: 'Shuffle again' }).click()
  await expect.poll(order).not.toBe(first)
  expect([...(await order())].sort()).toEqual([...table].sort())
})

test('the title fits on one line, even with every row in both scripts', async ({ page }) => {
  await seed(page, { settings: { sheetScript: 'both' } })
  await page.goto('./#/worksheet')
  await page.getByRole('button', { name: 'Select all' }).click()
  await page.emulateMedia({ media: 'print' })
  const title = page.locator('.worksheet-print .sheet header strong').first()
  await expect(title).toHaveText(/ぱ$/)
  const lines = await title.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size
  })
  expect(lines).toBe(1)
})

test('Print prints only the pages, at A4 size', async ({ page }) => {
  await page.goto('./#/worksheet')
  await page.evaluate(() => {
    ;(window as unknown as { printed: number }).printed = 0
    window.print = () => (window as unknown as { printed: number }).printed++
  })
  await page.getByRole('button', { name: 'Print' }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { printed: number }).printed))
    .toBe(1)

  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('#app')).toBeHidden()
  const sheet = page.locator('.worksheet-print .sheet')
  await expect(sheet).toHaveCount(1)
  await expect(sheet).toBeVisible()
  // 210 × 297 mm at 96 px per inch.
  const box = await sheet.boundingBox()
  expect(Math.round(box!.width)).toBe(794)
  expect(Math.round(box!.height)).toBe(1123)
  await page.emulateMedia({ media: 'screen' })
  await expect(page.locator('.worksheet-print')).toBeHidden()

  // Leaving the page takes the printed copy with it.
  await page.goto('./#/practice')
  await expect(page.locator('.worksheet-print')).toHaveCount(0)
})
