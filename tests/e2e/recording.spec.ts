import { expect, test } from '@playwright/test'

// Chromium's fake microphone, allowed without asking.
test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
})

test('record yourself on a kana card, then compare', async ({ page }) => {
  await page.goto('./#/table')
  await page.getByRole('button', { name: /あ/ }).first().click()
  const record = page.getByRole('group', { name: 'Record and compare' })
  await record.getByRole('button', { name: 'Record yourself' }).click()
  await record.getByRole('button', { name: 'Stop' }).click()
  // After recording, the reference and the recording play; then they can be replayed.
  await expect(record.getByRole('button', { name: 'Compare' })).toBeEnabled({ timeout: 10_000 })
  await expect(record.getByRole('button', { name: 'Mine' })).toBeVisible()
  await expect(record.getByRole('alert')).toHaveCount(0)
})
