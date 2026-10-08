import { expect, test } from '@playwright/test'
import { savedData, seed } from './helpers'

const DAY = 86_400_000

test('a card that becomes mature gets a hanko seal', async ({ page }) => {
  const now = Date.now()
  await seed(page, {
    settings: { newPerDay: 0 },
    cards: {
      hiragana: {
        a: {
          due: now - 1000,
          stability: 30,
          difficulty: 3,
          elapsed_days: 20,
          scheduled_days: 20,
          learning_steps: 0,
          reps: 6,
          lapses: 0,
          state: 2,
          last_review: now - 20 * DAY,
        },
      },
    },
  })
  await page.goto('./#/study/hiragana?mode=srs')
  await expect(page.getByText('1 left')).toBeVisible()
  await page.getByRole('button', { name: /Show answer/ }).click()
  await page.getByRole('button', { name: /Good/ }).click()
  await expect(page.getByRole('img', { name: 'Mastered!' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible({
    timeout: 5000,
  })
  const data = await savedData(page)
  expect(data.celebrated.hiragana).toEqual(['a'])
})

test('random font mode uses a font from the rotation', async ({ page }) => {
  await seed(page, { settings: { fontMode: 'random', randomFonts: ['yuji-syuku', 'dotgothic16'] } })
  await page.goto('./#/study/hiragana?mode=srs')
  await page.getByRole('button', { name: /Show answer/ }).click()
  await expect(page.locator('.font-name')).toHaveText(/Yuji Syuku|DotGothic16/)
})

test('Kunrei romanisation is shown when chosen', async ({ page }) => {
  await seed(page, { settings: { romaji: 'kunrei' } })
  await page.goto('./#/table')
  await expect(page.getByRole('button', { name: /^し, shi/ }).locator('.romaji')).toHaveText('si')
})

test('progress can be imported from a file', async ({ page }) => {
  await page.goto('./#/settings')
  const save = {
    version: 1,
    settings: { theme: 'dark' },
    cards: {
      katakana: {
        ka: {
          due: Date.now() + DAY,
          stability: 3,
          difficulty: 5,
          elapsed_days: 0,
          scheduled_days: 2,
          learning_steps: 0,
          reps: 2,
          lapses: 0,
          state: 2,
        },
      },
    },
  }
  await page.locator('input[type=file]').setInputFiles({
    name: 'kana-progress.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  })
  await expect(page.getByText('Progress imported')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const data = await savedData(page)
  expect(Object.keys(data.cards.katakana)).toEqual(['ka'])
})

test('importing an invalid file shows an error', async ({ page }) => {
  await page.goto('./#/settings')
  await page.locator('input[type=file]').setInputFiles({
    name: 'oops.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not json'),
  })
  await expect(page.getByText(/Import failed/)).toBeVisible()
})

test('a wrong listening answer can be compared and then skipped', async ({ page }) => {
  await page.goto('./#/listen/katakana')
  const options = page.getByRole('group', { name: 'Which kana did you hear?' }).getByRole('button')
  await expect(options).toHaveCount(6)
  // The first card is あ/ア ("a"); pick any option that is not ア.
  const wrong = options.filter({ hasNotText: 'ア' }).first()
  await wrong.click()
  await expect(page.locator('.option.wrong')).toBeVisible()
  await expect(page.getByRole('button', { name: /Hear what you picked/ })).toBeVisible()
  await page.getByRole('button', { name: /Next/ }).click()
  await expect(page.locator('.option.wrong')).toHaveCount(0)
  const data = await savedData(page)
  expect(data.log[0]).toMatchObject({ mode: 'listen', correct: false })
})

test('a confusable-pairs quiz ends with a score', async ({ page }) => {
  await page.goto('./#/drills/ru-ro')
  await page.getByRole('button', { name: 'Test yourself' }).click()
  const group = page.getByRole('group', { name: 'Which one is it?' })
  for (let i = 0; i < 10; i++) {
    await group.getByRole('button').first().click()
    await page.waitForTimeout(i === 9 ? 100 : 1700)
  }
  await expect(page.getByRole('heading', { name: /\/ 10 correct/ })).toBeVisible({ timeout: 5000 })
})

test('after a correct listening answer the next card waits a moment', async ({ page }) => {
  await page.clock.install()
  await page.goto('./#/listen/hiragana')
  const group = page.getByRole('group', { name: 'Which kana did you hear?' })
  await expect(group.getByRole('button')).toHaveCount(6)
  // The first card is あ.
  await group.getByRole('button').filter({ hasText: 'あ' }).click()
  await expect(page.locator('.option.right')).toBeVisible()
  await page.clock.runFor(1500)
  await expect(page.locator('.option.right')).toBeVisible()
  await page.clock.runFor(1000)
  await expect(page.locator('.option.right')).toHaveCount(0)
})

test('Next skips the wait after a correct listening answer', async ({ page }) => {
  await page.goto('./#/listen/hiragana')
  const group = page.getByRole('group', { name: 'Which kana did you hear?' })
  await group.getByRole('button').filter({ hasText: 'あ' }).click()
  await page.getByRole('button', { name: /^Next/ }).click()
  await expect(page.locator('.option.right')).toHaveCount(0)
})
