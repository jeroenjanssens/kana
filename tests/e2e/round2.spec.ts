import { expect, test } from '@playwright/test'
import { quizOnly, savedData, seed } from './helpers'

const DAY = 86_400_000

test('undo brings back the last card exactly as it was', async ({ page }) => {
  await quizOnly(page)
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
  await quizOnly(page)
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

test('a new kana is introduced first, then comes back as a quiz', async ({ page }) => {
  await seed(page, { settings: { newPerDay: 1 } })
  await page.goto('./#/study/hiragana?mode=srs')
  const intro = page.getByRole('article', { name: 'New kana: a' })
  await expect(intro).toBeVisible()
  await expect(intro.getByRole('img', { name: /Stroke order for あ/ })).toBeVisible()
  await expect(intro).toContainText('antenna')
  await intro.getByRole('button', { name: /Got it/ }).click()
  // Only that card is left: it comes back as a quiz (learning ahead).
  await expect(page.getByRole('button', { name: /Hiragana card/ })).toBeVisible()
  await page.getByRole('button', { name: /Show answer/ }).click()
  await page.getByRole('button', { name: /Good/ }).click()
  const data = await savedData(page)
  expect(data.log.map((e: { mode: string }) => e.mode)).toEqual(['intro', 'srs'])
})

test('a dakuten note is shown with the first dakuten kana only', async ({ page }) => {
  await seed(page, { settings: { groups: ['dakuten'], newPerDay: 2 } })
  await page.goto('./#/study/hiragana?mode=srs')
  await expect(page.getByRole('article', { name: 'New kana: ga' })).toContainText('dakuten')
  await page.getByRole('button', { name: /Got it/ }).click()
  const second = page.getByRole('article', { name: 'New kana: gi' })
  await expect(second).toBeVisible()
  await expect(second).not.toContainText('Two small marks')
})

test('introductions can be switched off', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/study/hiragana?mode=srs')
  await expect(page.getByRole('button', { name: /Hiragana card/ })).toBeVisible()
  await expect(page.getByRole('article', { name: /New kana/ })).toHaveCount(0)
})

test('the daily goal fills up and is celebrated once', async ({ page }) => {
  await quizOnly(page, { settings: { dailyGoal: 2 } })
  await page.goto('./#/study/hiragana?mode=srs')
  for (const label of ['Easy', 'Good']) {
    await page.getByRole('button', { name: /Show answer/ }).click()
    await page.getByRole('button', { name: new RegExp(label) }).click()
  }
  await expect(page.getByText(/Daily goal reached/)).toBeVisible()
  await page.getByRole('button', { name: 'Leave session (Esc)' }).click()
  await expect(page.getByLabel('Daily goal: 2 of 2')).toHaveClass(/reached/)
  expect((await savedData(page)).goalDay).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('a calendar reminder can be downloaded', async ({ page }) => {
  await page.goto('./#/settings')
  await page.getByLabel('Reminder time').fill('08:15')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Add to calendar' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('kana-reminder.ics')
  const text = await (await file.createReadStream()).toArray()
  expect(Buffer.concat(text).toString()).toMatch(/DTSTART:\d{8}T081500/)
})

test('intervals can be personalised with the FSRS optimiser', async ({ page }) => {
  const DAY_MS = 86_400_000
  const start = Date.now() - 200 * DAY_MS
  let state = 3
  const rand = () => (state = (state * 16807) % 2147483647) / 2147483647
  const log = []
  for (let c = 0; c < 100; c++) {
    let day = 0
    let ivl = 1
    for (let k = 0; k < 6; k++) {
      const grade = rand() < 0.15 ? 1 : 3
      log.push({
        t: start + day * DAY_MS,
        mode: 'srs',
        deck: 'hiragana',
        id: `k${c}`,
        correct: grade > 1,
        grade,
        ms: 1000,
      })
      ivl = grade === 1 ? 1 : Math.round(ivl * 2.2)
      day += ivl
    }
  }
  await seed(page, { log })
  await page.goto('./#/settings')
  const button = page.getByRole('button', { name: 'Optimise' })
  await expect(button).toBeEnabled()
  await button.click()
  await expect(page.getByText('Intervals personalised to how you remember')).toBeVisible({
    timeout: 60_000,
  })
  const data = await savedData(page)
  expect(data.settings.fsrsWeights).toHaveLength(21)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  expect((await savedData(page)).settings.fsrsWeights).toEqual([])
})
