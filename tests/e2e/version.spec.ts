import { expect, test } from '@playwright/test'

test('the version is shown, and clicking it checks for updates', async ({ page, isMobile }) => {
  test.skip(isMobile, 'on phones the version is in Settings')
  await page.goto('./')
  const version = page.getByRole('button', { name: /^Version dev · Check for updates$/ })
  await expect(version).toHaveText('vdev')
  await version.click()
  await expect(page.getByText('You have the latest version (dev)')).toBeVisible()
  // The build says which version it is.
  expect(await (await page.request.get('./version.json')).json()).toEqual({ version: 'dev' })
})

test("an update check that can't reach the server says so", async ({ page, isMobile }) => {
  test.skip(isMobile, 'on phones the version is in Settings')
  await page.goto('./')
  await page.route('**/version.json', (route) => route.abort())
  await page.getByRole('button', { name: /Check for updates/ }).click()
  await expect(page.getByText("Couldn't check for updates")).toBeVisible()
})

test('on phones the version is in Settings', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout')
  await page.goto('./#/settings')
  await expect(page.getByText(/Version dev ·/)).toBeVisible()
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.getByText('You have the latest version (dev)')).toBeVisible()
})
