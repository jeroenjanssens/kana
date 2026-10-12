import { expect, test } from '@playwright/test'
import { quizOnly, savedData, seed, trackErrors } from './helpers'

test('a new hiragana is introduced with its drawing and Tofugu’s hint', async ({ page }) => {
  const errors = trackErrors(page)
  await seed(page, { settings: { newPerDay: 1 } })
  await page.goto('./#/study/hiragana?mode=srs')
  const intro = page.locator('.intro')
  await expect(intro.locator('svg.art')).toBeVisible()
  await expect(intro.getByText(/find the letter/)).toBeVisible()
  await page.getByRole('button', { name: /Got it/ }).click()
  // The front shows the plain kana; the drawing comes with the answer.
  const card = page.locator('.card')
  await expect(card.locator('.front svg.art')).toHaveCount(0)
  await page.getByRole('button', { name: /Show answer/ }).click()
  await expect(card.locator('.back svg.art')).toBeVisible()
  errors.check()
})

test('D hides the drawing and remembers it', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/study/hiragana?mode=order&ids=e')
  await page.getByRole('button', { name: /Show answer/ }).click()
  const back = page.locator('.card .back')
  await expect(back.locator('svg.art')).toBeVisible()
  await page.keyboard.press('d')
  await expect(back.locator('svg.art')).toHaveCount(0)
  await expect(back.getByRole('button', { name: /Drawing/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  expect((await savedData(page)).settings.drawings).toBe('off')
})

test('"Always" shows the drawing on the front too', async ({ page }) => {
  await quizOnly(page, { settings: { drawings: 'always' } })
  await page.goto('./#/study/hiragana?mode=order&ids=ka')
  await expect(page.locator('.card .front svg.art')).toBeVisible()
})

test('katakana cards have their own drawing and hint', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/study/katakana?mode=order&ids=ku')
  await page.getByRole('button', { name: /Show answer/ }).click()
  const back = page.locator('.card .back')
  await expect(back.getByText(/long cook’s hat/)).toBeVisible()
  await expect(back.locator('svg.art')).toBeVisible()
})

test('kana with dakuten have no drawing', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/study/katakana?mode=order&ids=ga')
  await page.getByRole('button', { name: /Show answer/ }).click()
  await expect(page.locator('.card svg.art')).toHaveCount(0)
  await expect(page.locator('.card').getByRole('button', { name: /Drawing/ })).toHaveCount(0)
})

test('the combined deck labels both hints', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/study/combined?mode=order&ids=e')
  await page.getByRole('button', { name: /Show answer/ }).click()
  const hints = page.locator('.card .back .mnemonic')
  await expect(hints.getByText('Hiragana', { exact: true })).toBeVisible()
  await expect(hints.getByText('Katakana', { exact: true })).toBeVisible()
  await expect(page.locator('.card .back svg.art')).toHaveCount(2)
})

test('the table details show the drawing and label each hint', async ({ page }) => {
  await page.goto('./#/table')
  await page.getByRole('button', { name: /^き, ki/ }).click()
  const details = page.locator('.details')
  await expect(details.locator('svg.art')).toHaveCount(2)
  const hints = details.locator('.hints li')
  await expect(hints.nth(0)).toContainText(/Hiragana.*resembles a key/)
  await expect(hints.nth(1)).toContainText(/Katakana.*part of a weird key/)
})

test('the setting chooses when drawings are shown', async ({ page }) => {
  await seed(page, {})
  await page.goto('./#/settings')
  const group = page.getByRole('group', { name: 'Memory-hint drawings' })
  await expect(group.getByRole('button', { name: 'After the answer' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await group.getByRole('button', { name: 'Always' }).click()
  expect((await savedData(page)).settings.drawings).toBe('always')
})

test('a long hint keeps the answer buttons on screen', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/study/hiragana?mode=order&ids=ne')
  await page.getByRole('button', { name: /Show answer/ }).click()
  await expect(page.locator('.card .back').getByText(/necromancer/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Got it/ })).toBeInViewport()
})
