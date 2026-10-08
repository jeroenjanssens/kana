import { expect, test } from '@playwright/test'
import { trackErrors } from './helpers'

test('home page shows the three decks', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Hiragana' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Katakana' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Combined' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Study 10' }).first()).toBeVisible()
  errors.check()
})

test('main navigation reaches every section', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./')
  const nav = page.getByRole('navigation', { name: 'Main' })
  await nav.getByRole('link', { name: 'Table' }).click()
  await expect(page.getByRole('heading', { name: 'Kana table' })).toBeVisible()
  await nav.getByRole('link', { name: 'Practice' }).click()
  await expect(page.getByRole('heading', { name: 'Practice', exact: true })).toBeVisible()
  await nav.getByRole('link', { name: 'Stats' }).click()
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible()
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await nav.getByRole('link', { name: 'Learn' }).click()
  await expect(page.getByRole('heading', { name: 'Hiragana' })).toBeVisible()
  errors.check()
})

test('unknown routes show a friendly page', async ({ page }) => {
  await page.goto('./#/nowhere')
  await expect(page.getByText("This page doesn't exist.")).toBeVisible()
})

test('credits list photos and sources', async ({ page }) => {
  await page.goto('./#/credits')
  await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible()
  await expect(page.getByText('Hakatanoshio117117')).toBeVisible()
  await expect(page.locator('.photos li').first()).toBeVisible()
})

test('shortcut help opens with ?', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard only')
  await page.goto('./')
  await page.keyboard.press('Shift+?')
  await expect(page.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeVisible()
})
