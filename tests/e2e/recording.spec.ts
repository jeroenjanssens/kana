import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { savedData } from './helpers'

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

/** Serve a stand-in speech model (fixed random weights, from the parity fixture). */
async function standInModel(page: import('@playwright/test').Page) {
  const fixture = JSON.parse(readFileSync('tests/fixtures/speech/parity.json', 'utf8'))
  await page.route('**/models/kana-speech-*.json', (route) => route.fulfill({ json: fixture.meta }))
  await page.route('**/models/kana-speech-*.bin', (route) =>
    route.fulfill({ body: Buffer.from(fixture.bin, 'base64') }),
  )
}

test('say it: listen with the offline model and show what it heard', async ({ page }) => {
  await standInModel(page)
  await page.goto('./#/speak')
  await page.getByRole('button', { name: 'Clear' }).click()
  await page.locator('.row-chip', { hasText: 'あ' }).click()
  await page.getByRole('button', { name: /Start · 5 kana/ }).click()
  await page.getByRole('button', { name: 'Say it' }).click()
  // The fake microphone beeps; listening stops by itself and the model gives its verdict.
  await expect(page.getByRole('button', { name: /^Say again/ })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: /^Next Enter/ }).click()
  await expect(page.getByText('2 / 5')).toBeVisible()
  const data = await savedData(page)
  expect(data.log).toHaveLength(1)
  expect(data.log[0]).toMatchObject({ mode: 'speak', deck: 'hiragana', id: 'a' })
  expect(data.cards).toEqual({})
})

test('the speech test page runs the offline model too', async ({ page }) => {
  await standInModel(page)
  await page.goto('./#/speech')
  await page.getByRole('button', { name: 'Say あ (offline)' }).click()
  await expect(page.locator('.results .source', { hasText: 'offline' })).toBeVisible({
    timeout: 15_000,
  })
})

test("without the model (offline before first use) it says what's wrong", async ({ page }) => {
  await page.route('**/models/**', (route) => route.abort())
  await page.goto('./#/speak')
  await page.getByRole('button', { name: /Start/ }).click()
  await page.getByRole('button', { name: 'Say it' }).click()
  await expect(page.getByRole('alert')).toContainText("couldn't be downloaded", {
    timeout: 15_000,
  })
})

test('the real speech model downloads and runs in the browser', async ({ page }) => {
  await page.goto('./#/speech')
  await page.getByRole('button', { name: 'Say あ (offline)' }).click()
  await expect(page.locator('.results .source', { hasText: 'offline' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('alert')).toHaveCount(0)
})
