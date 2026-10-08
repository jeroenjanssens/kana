import { expect, test, type Page } from '@playwright/test'
import { savedData, seed } from './helpers'

/** The photo being shown (during a cross-fade the outgoing image is still in the DOM). */
const currentPhoto = (page: Page) => page.locator('.backdrop').getAttribute('data-photo')

test('the arrows change the photo, and the choice survives a reload', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.backdrop img').first()).toBeVisible()
  const first = await currentPhoto(page)
  await page.getByRole('button', { name: 'Next photo' }).click()
  await expect.poll(() => currentPhoto(page)).not.toBe(first)
  const second = await currentPhoto(page)
  await page.getByRole('button', { name: 'Previous photo' }).click()
  await expect.poll(() => currentPhoto(page)).toBe(first)
  await page.getByRole('button', { name: 'Next photo' }).click()
  await expect.poll(() => currentPhoto(page)).toBe(second)
  await savedData(page)
  await page.reload()
  await expect.poll(() => currentPhoto(page)).toBe(second)
})

test('in fixed mode studying does not change the photo', async ({ page }) => {
  await seed(page, { settings: { photoMode: 'fixed', photoEvery: 3 } })
  await page.goto('./#/study/hiragana?mode=srs')
  await expect(page.locator('.backdrop img').first()).toBeVisible()
  const before = await currentPhoto(page)
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: /Show answer/ }).click()
    await page.getByRole('button', { name: /Easy/ }).click()
    await expect(page.getByText(`${9 - i} left`)).toBeVisible()
  }
  expect(await currentPhoto(page)).toBe(before)
})

test('in cards mode the photo changes after N cards', async ({ page }) => {
  await seed(page, { settings: { photoMode: 'cards', photoEvery: 3 } })
  await page.goto('./#/study/hiragana?mode=srs')
  await expect(page.locator('.backdrop img').first()).toBeVisible()
  const before = await currentPhoto(page)
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /Show answer/ }).click()
    await page.getByRole('button', { name: /Easy/ }).click()
  }
  await expect.poll(() => currentPhoto(page)).not.toBe(before)
})

test('a photo can be chosen in settings', async ({ page }) => {
  await page.goto('./#/settings')
  await page.getByText('Choose a photo').click()
  const thumb = page.locator('.thumb').nth(5)
  const title = await thumb.getAttribute('aria-label')
  await thumb.click()
  await expect(thumb).toHaveAttribute('aria-pressed', 'true')
  const data = await savedData(page)
  expect(data.settings.photoSlug).toBeTruthy()
  expect(title).toBeTruthy()
  await page
    .getByRole('group', { name: 'Change the photo' })
    .getByRole('button', { name: 'Fixed' })
    .click()
  expect((await savedData(page)).settings.photoMode).toBe('fixed')
})

test('on phones the arrows only show on Home and the Table', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout')
  await page.goto('./')
  await expect(page.getByRole('button', { name: 'Next photo' })).toBeVisible()
  await page.goto('./#/stats')
  await expect(page.getByRole('button', { name: 'Next photo' })).toBeHidden()
})
