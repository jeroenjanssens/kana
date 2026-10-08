import { expect, test } from '@playwright/test'
import { seed, youngCard } from './helpers'

test('table shows all basic kana with romaji toggle', async ({ page }) => {
  await page.goto('./#/table')
  await expect(page.getByRole('button', { name: 'あ, a' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ア, a' })).toBeVisible()
  await expect(page.locator('.cell .romaji').first()).toBeVisible()
  await page.getByRole('checkbox', { name: 'Romaji' }).uncheck({ force: true })
  await expect(page.locator('.cell .romaji')).toHaveCount(0)
})

test('combined layout shows pairs', async ({ page }) => {
  await page.goto('./#/table')
  await page.getByRole('button', { name: 'Combined', exact: true }).click()
  await expect(page.getByRole('button', { name: 'し シ, shi' })).toBeVisible()
})

test('clicking a kana shows its details', async ({ page }) => {
  await seed(page, { cards: { hiragana: { ka: youngCard() } } })
  await page.goto('./#/table')
  await page.getByRole('button', { name: /^か, ka/ }).click()
  const details = page.locator('.details')
  await expect(details.locator('.romaji')).toHaveText('ka')
  await expect(details.getByText('Young')).toBeVisible()
  await expect(page.getByRole('button', { name: /^か, ka, young/ })).toHaveClass(/level-young/)
})

test('clicking a yōon plays its pronunciation', async ({ page }) => {
  await page.goto('./#/table')
  const request = page.waitForRequest(/audio\/female\/kya\.mp3$/)
  await page.getByRole('button', { name: /^きゃ, kya/ }).click()
  await request
})
