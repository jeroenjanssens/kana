import { expect, test } from '@playwright/test'
import { savedData, seed } from './helpers'

const DAY = 86_400_000

test('undo brings back the last card exactly as it was', async ({ page }) => {
  await page.goto('./#/study/hiragana?mode=srs')
  const card = page.getByRole('button', { name: /Hiragana card/ })
  await expect(page.getByText('10 left')).toBeVisible()
  const undo = page.getByRole('button', { name: /Undo last answer/ })
  await expect(undo).toBeDisabled()
  await page.getByRole('button', { name: /Show answer/ }).click()
  await page.getByRole('button', { name: /Easy/ }).click()
  await expect(page.getByText('9 left')).toBeVisible()
  await undo.click()
  await expect(page.getByText('10 left')).toBeVisible()
  await expect(card).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.front-glyph')).toHaveText('あ')
  const data = await savedData(page)
  expect(data.log).toHaveLength(0)
  expect(data.cards.hiragana ?? {}).toEqual({})
})

test('undo works with the U key, several steps back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard only')
  await page.goto('./#/study/hiragana?mode=srs')
  const card = page.getByRole('button', { name: /Hiragana card/ })
  for (const [i, key] of ['4', '1', '3'].entries()) {
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await page.keyboard.press('Space')
    await page.keyboard.press(key)
    await expect(page.locator('.count')).toContainText(`${9 - i} left`)
  }
  await expect(page.locator('.count')).toContainText('7 left')
  await page.keyboard.press('u')
  await page.keyboard.press('u')
  await expect(page.locator('.count')).toHaveText(/^\s*9 left\s*$/)
  expect((await savedData(page)).log).toHaveLength(1)
})

test('a card forgotten too often is marked as tricky', async ({ page }) => {
  const now = Date.now()
  await seed(page, {
    settings: { newPerDay: 0 },
    cards: {
      hiragana: {
        nu: {
          due: now - 1000,
          stability: 2,
          difficulty: 8,
          elapsed_days: 2,
          scheduled_days: 2,
          learning_steps: 0,
          reps: 12,
          lapses: 5,
          state: 2,
          last_review: now - 2 * DAY,
        },
      },
    },
  })
  await page.goto('./#/study/hiragana?mode=srs')
  await page.getByRole('button', { name: /Show answer/ }).click()
  await page.getByRole('button', { name: /Again/ }).click()
  await expect(page.getByText(/You keep forgetting ぬ/)).toBeVisible()
  // It comes back (relearning) with the tricky chip and a drill link.
  await page.getByRole('button', { name: /Show answer/ }).click()
  await expect(page.locator('.tricky')).toContainText('Tricky')
  await expect(page.locator('.tricky a')).toHaveAttribute('href', /#\/drills\//)
  await page.goto('./#/stats')
  await expect(page.getByRole('heading', { name: 'Tricky kana' })).toBeVisible()
})
