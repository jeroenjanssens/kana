import { expect, test, type Page } from '@playwright/test'
import { words } from '../../src/lib/data/words'
import { savedData, seed, trackErrors, youngCard } from './helpers'

const KNOWN = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko']
const HIRAGANA = { hiragana: Object.fromEntries(KNOWN.map((id) => [id, youngCard()])) }
/** The words these kana unlock. */
const UNLOCKED = words.filter((w) => /^[あいうえおかきくけこ]+$/.test(w.kana))

async function startReading(page: Page, save: Record<string, unknown> = {}) {
  await seed(page, { settings: { autoplay: false }, cards: HIRAGANA, ...save })
  await page.goto('./#/reading')
  await page.getByRole('button', { name: 'Start reading' }).click()
}

/** The word on the front of the card. */
const front = (page: Page) => page.locator('.face.front .glyph').textContent()

async function answer(page: Page, grade: 'Again' | 'Hard' | 'Good' | 'Easy') {
  await page.getByRole('button', { name: /Show reading/ }).click()
  await page.getByRole('button', { name: new RegExp(`^${grade}`) }).click()
  // The next card (unturned), or the summary.
  await page.locator('.card:not(.flipped), .done').first().waitFor()
}

test('four answers, with the next interval on each', async ({ page }) => {
  const errors = trackErrors(page)
  await startReading(page)
  await page.getByRole('button', { name: /Show reading/ }).click()
  const grades = page.getByRole('group', { name: 'How well did you know it?' })
  await expect(grades.getByRole('button')).toHaveText([/Again.*1/, /Hard.*2/, /Good.*3/, /Easy.*4/])
  await expect(grades.getByRole('button', { name: /^Good/ })).toContainText(/\d+(m|h|d)/)
  const word = await page.locator('.face.back .glyph').textContent()
  await page.keyboard.press('4')
  const data = await savedData(page)
  expect(data.log[0]).toMatchObject({ mode: 'reading', id: word, grade: 4, correct: true })
  expect(data.words[word!]).toMatchObject({ seen: 1, correct: 1, card: { reps: 1 } })
  errors.check()
})

test('a word answered Again comes back in the round, and is in the summary', async ({ page }) => {
  await startReading(page, { settings: { autoplay: false, readingCount: 10 } })
  const missed = await front(page)
  await answer(page, 'Again')
  const after: (string | null)[] = []
  for (let i = 0; i < 9; i++) {
    after.push(await front(page))
    await answer(page, 'Good')
  }
  const gap = after.indexOf(missed)
  expect(gap).toBeGreaterThanOrEqual(3)
  expect(gap).toBeLessThanOrEqual(5)
  await expect(page.getByText('9 / 10 words read correctly')).toBeVisible()
  const list = page.locator('.missed-words')
  await expect(list.getByRole('button')).toHaveCount(1)
  await list.getByRole('button').click()
  await expect(page.getByRole('article', { name: missed! })).toBeVisible()
})

test('undo puts the word back', async ({ page }) => {
  await startReading(page)
  const first = await front(page)
  await answer(page, 'Easy')
  await expect(page.getByText('2 / 15')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('1 / 15')).toBeVisible()
  expect(await front(page)).toBe(first)
  const data = await savedData(page)
  expect(data.log).toEqual([])
  expect(data.words).toEqual({})
})

test('the script and the number of cards are chosen, and remembered', async ({ page }) => {
  const katakana = ['a', 'i', 'su', 'ku', 'ri', 'mu']
  await seed(page, {
    settings: { autoplay: false },
    cards: {
      ...HIRAGANA,
      katakana: Object.fromEntries(katakana.map((id) => [id, youngCard()])),
    },
  })
  await page.goto('./#/reading')
  await page
    .getByRole('group', { name: 'Script' })
    .getByRole('button', { name: 'Katakana' })
    .click()
  await page
    .getByRole('group', { name: 'Cards per round' })
    .getByRole('button', { name: '10' })
    .click()
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByText('1 / 10')).toBeVisible()
  for (let i = 0; i < 4; i++) {
    expect(await front(page)).toMatch(/^[゠-ヿ]+$/)
    await answer(page, 'Good')
  }
  const data = await savedData(page)
  expect(data.settings).toMatchObject({ readingScript: 'katakana', readingCount: 10 })
})

test('with no limit the round goes on until you leave, then shows the summary', async ({
  page,
}) => {
  await startReading(page, { settings: { autoplay: false, readingCount: 0 } })
  // More answers than there are words: a round never runs out.
  for (let i = 0; i < UNLOCKED.length + 3; i++) await answer(page, 'Good')
  await expect(page.getByText(`${UNLOCKED.length + 3} answered`)).toBeVisible()
  await page.getByRole('button', { name: 'Leave (Esc)' }).click()
  await expect(
    page.getByText(`${UNLOCKED.length + 3} / ${UNLOCKED.length + 3} words read`),
  ).toBeVisible()
})

test('leaving before answering goes back to the overview', async ({ page }) => {
  await startReading(page)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Start reading' })).toBeVisible()
})

test('typed answers suggest a grade; Enter takes it', async ({ page }) => {
  await startReading(page, { settings: { autoplay: false, answerStyle: 'typed' } })
  const kana = await front(page)
  const word = words.find((w) => w.kana === kana)!
  await page.getByRole('textbox').fill(word.accept[0])
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(page.locator('.grade.suggested')).toHaveCount(1)
  await page.keyboard.press('Enter')
  const data = await savedData(page)
  expect(data.log[0]).toMatchObject({ correct: true })
  expect(data.log[0].grade).toBeGreaterThan(1)
})
