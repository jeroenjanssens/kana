import { expect, test } from '@playwright/test'
import { savedData, seed, trackErrors } from './helpers'

test('SRS session: reveal, grade and persist progress', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./#/study/hiragana?mode=srs')
  await expect(page.getByText('10 left')).toBeVisible()
  const card = page.getByRole('button', { name: /Hiragana card/ })
  await expect(card).toBeVisible()
  await page.getByRole('button', { name: /Show answer/ }).click()
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Good/ })).toBeVisible()
  await page.getByRole('button', { name: /Easy/ }).click()
  await expect(page.getByText('9 left')).toBeVisible()

  const data = await savedData(page)
  expect(Object.keys(data.cards.hiragana)).toEqual(['a'])
  expect(data.log).toHaveLength(1)

  await page.goto('./')
  await expect(page.getByRole('link', { name: 'Study 9' }).first()).toBeVisible()
  errors.check()
})

test('keyboard: space reveals, number keys grade', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard only')
  await page.goto('./#/study/katakana?mode=srs')
  await expect(page.getByText('10 left')).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: /Again/ })).toBeVisible()
  await page.keyboard.press('4')
  await expect(page.getByText('9 left')).toBeVisible()
  await page.keyboard.press('Space')
  await page.keyboard.press('1')
  // "Again" keeps the card in the session: it counts as seen, and comes back.
  await expect(page.locator('.count')).toHaveText(/8 left\s*·\s*1 again/)
})

test('the progress bar moves on every grade, not only on Easy', async ({ page }) => {
  await page.goto('./#/study/hiragana?mode=srs')
  const bar = page.locator('.progress span')
  const width = () => bar.evaluate((el) => parseFloat((el as HTMLElement).style.width))
  expect(await width()).toBe(0)
  for (const [i, label] of ['Good', 'Hard', 'Again'].entries()) {
    await page.getByRole('button', { name: /Show answer/ }).click()
    await page.getByRole('button', { name: new RegExp(label) }).click()
    await expect.poll(width).toBeCloseTo((i + 1) * 10)
  }
  await expect(page.locator('.count')).toHaveText(/7 left\s*·\s*3 again/)
})

test('typed answers are checked and suggest a grade', async ({ page }) => {
  await seed(page, { settings: { answerStyle: 'typed' } })
  await page.goto('./#/study/hiragana?mode=srs')
  const input = page.getByRole('textbox', { name: 'Your answer in romaji' })
  await input.fill('a')
  await input.press('Enter')
  await expect(page.getByText('Correct')).toBeVisible()
  await expect(page.locator('.grade.suggested')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByText('9 left')).toBeVisible()
  await page.getByRole('textbox', { name: 'Your answer in romaji' }).fill('ka')
  await page.keyboard.press('Enter')
  await expect(page.getByText('You typed')).toBeVisible()
})

test('combined deck shows both scripts', async ({ page }) => {
  await page.goto('./#/study/combined?mode=srs')
  await expect(page.getByRole('button', { name: /Hiragana and katakana card/ })).toBeVisible()
  await expect(page.locator('.front-glyph .glyph')).toHaveCount(2)
})

test('in-order mode: choose rows and step through', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./#/study/hiragana?mode=order')
  await expect(page.getByRole('heading', { name: 'Study in order' })).toBeVisible()
  await page.getByRole('button', { name: /Start · 10 kana/ }).click()
  await expect(page.getByText('1 / 10')).toBeVisible()
  await page.getByRole('button', { name: /Show answer/ }).click()
  await page.getByRole('button', { name: /Got it/ }).click()
  await expect(page.getByText('2 / 10')).toBeVisible()
  await page.getByRole('button', { name: /Show answer/ }).click()
  await page.getByRole('button', { name: 'Next (→)' }).click()
  await expect(page.getByText('3 / 10')).toBeVisible()
  await page.getByRole('button', { name: 'Previous (←)' }).click()
  await expect(page.getByText('2 / 10')).toBeVisible()
  const data = await savedData(page)
  expect(data.cards).toEqual({})
  expect(data.log[0]).toMatchObject({ mode: 'order', id: 'a', correct: true })
  errors.check()
})

test('in-order mode can start from a list of ids', async ({ page }) => {
  await page.goto('./#/study/katakana?mode=order&ids=shi,tsu,so,n')
  await expect(page.getByText('1 / 4')).toBeVisible()
})

test('stroke order and font gallery open from the card', async ({ page }) => {
  await page.goto('./#/study/hiragana?mode=srs')
  await page.getByRole('button', { name: /Show answer/ }).click()
  await page.getByRole('button', { name: 'Stroke order (S)' }).click()
  await expect(page.getByRole('img', { name: /Stroke order for あ, 3 strokes/ })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Font gallery (F)' }).click()
  await expect(page.getByRole('list', { name: 'あ in different fonts' }).last()).toBeVisible()
})

test('leaving a session returns home', async ({ page }) => {
  await page.goto('./#/study/hiragana?mode=srs')
  await page.getByRole('button', { name: 'Leave session (Esc)' }).click()
  await expect(page.getByRole('heading', { name: 'Hiragana' })).toBeVisible()
})
