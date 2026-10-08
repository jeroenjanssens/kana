import { expect, test } from '@playwright/test'
import { savedData, seed, youngCard } from './helpers'

test('theme can be switched to dark', async ({ page }) => {
  await page.goto('./#/settings')
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const data = await savedData(page)
  expect(data.settings.theme).toBe('dark')
})

test('sound effects can be muted from the header and with M', async ({ page, isMobile }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Mute sound effects/ }).click()
  await expect(page.getByRole('button', { name: /Unmute sound effects/ })).toBeVisible()
  if (!isMobile) {
    await page.keyboard.press('m')
    await expect(page.getByRole('button', { name: /^Mute sound effects/ })).toBeVisible()
  }
})

test('random font mode shows the rotation checkboxes', async ({ page }) => {
  await page.goto('./#/settings')
  await page
    .getByRole('group', { name: 'Font mode' })
    .getByRole('button', { name: 'Random fonts' })
    .click()
  await expect(page.getByText('in rotation').first()).toBeVisible()
})

test('export downloads a JSON file', async ({ page }) => {
  await seed(page, { cards: { hiragana: { a: youngCard() } } })
  await page.goto('./#/settings')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress' }).click()
  expect((await download).suggestedFilename()).toMatch(/^kana-progress-\d{4}-\d{2}-\d{2}\.json$/)
})

test('reset asks for confirmation and clears progress', async ({ page }) => {
  await seed(page, { cards: { hiragana: { a: youngCard() } } })
  await page.goto('./#/settings')
  await page.getByRole('button', { name: 'Reset progress…' }).click()
  await page.getByRole('button', { name: 'Yes, erase all progress' }).click()
  const data = await savedData(page)
  expect(data.cards).toEqual({})
})

test('stats show streak and mastery', async ({ page }) => {
  const now = Date.now()
  await seed(page, {
    cards: { hiragana: { a: youngCard(now) } },
    log: [{ t: now, mode: 'srs', deck: 'hiragana', id: 'a', correct: true, ms: 1200, grade: 3 }],
  })
  await page.goto('./#/stats')
  await expect(page.getByText('day streak')).toBeVisible()
  await expect(page.getByRole('img', { name: /answers in the last year/ })).toBeVisible()
})
