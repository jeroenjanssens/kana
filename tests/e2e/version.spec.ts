import { expect, test } from '@playwright/test'

/** The version the app was built with: the CI run number, or "dev" locally. */
const VERSION = process.env.KANA_VERSION || 'dev'

test('the version is shown, and clicking it checks for updates', async ({ page, isMobile }) => {
  test.skip(isMobile, 'on phones the version is in Settings')
  await page.goto('./')
  const version = page.getByRole('button', {
    name: `Version ${VERSION} · Check for updates`,
    exact: true,
  })
  await expect(version).toHaveText(`v${VERSION}`)
  await version.click()
  await expect(page.getByText(`You have the latest version (${VERSION})`)).toBeVisible()
  // The build says which version it is.
  expect(await (await page.request.get('./version.json')).json()).toEqual({ version: VERSION })
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
  await expect(page.getByText(`Version ${VERSION} ·`)).toBeVisible()
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.getByText(`You have the latest version (${VERSION})`)).toBeVisible()
})
