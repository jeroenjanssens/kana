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

test.describe('the word list', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, {
      cards: HIRAGANA,
      words: { あか: { seen: 4, correct: 3, last: 1, card: youngCard() } },
    })
    await page.goto('./#/reading')
  })

  const section = (page: Page, name: RegExp) =>
    page.locator('section.section').filter({ has: page.getByRole('button', { name }) })
  const rows = (page: Page, name: RegExp) => section(page, name).locator('tbody tr')

  test('shows unlocked words with their romaji, meaning, voices and progress', async ({ page }) => {
    const hiragana = rows(page, /^Hiragana words/)
    await expect(hiragana).toHaveCount(UNLOCKED.length)
    const aka = hiragana.filter({ hasText: 'aka' }).first()
    await expect(aka).toContainText('red')
    await expect(aka).toContainText('3 / 4')
    await expect(aka).toContainText(/in \d+d/)
    const file = String(words.find((w) => w.kana === 'あか')!.index).padStart(3, '0')
    const request = page.waitForRequest(new RegExp(`audio/male/words/${file}\\.mp3$`))
    await aka.getByRole('button', { name: 'あか · Male' }).click()
    await request
    await aka.getByRole('button', { name: /^あか: aka/ }).click()
    await expect(page.getByRole('article', { name: 'あか' })).toBeVisible()
  })

  test('sections open and close, and stay that way', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /^Hiragana words/ })
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(rows(page, /^Hiragana words/)).toHaveCount(0)
    await page.getByRole('button', { name: /^Katakana words/ }).click()
    const data = await savedData(page)
    expect(data.settings.wordListOpen).toEqual(['katakana'])
  })

  const firstWords = async (page: Page) =>
    (
      await rows(page, /^Hiragana words/)
        .locator('td.kana')
        .allTextContents()
    ).slice(0, 3)
  const sorted = [...UNLOCKED.map((w) => w.kana)].sort(new Intl.Collator('ja').compare)

  test('sorts by a column, reversed on a second click', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no column headings on a phone: see the next test')
    const heading = page.getByRole('columnheader', { name: /Word/ }).first()
    await heading.getByRole('button').click()
    await expect(heading).toHaveAttribute('aria-sort', 'ascending')
    expect(await firstWords(page)).toEqual(sorted.slice(0, 3))
    await heading.getByRole('button').click()
    await expect(heading).toHaveAttribute('aria-sort', 'descending')
    expect(await firstWords(page)).toEqual([...sorted].reverse().slice(0, 3))
    // How you're doing: the one practised word last (the others are new).
    await page
      .getByRole('columnheader', { name: /How you’re doing/ })
      .first()
      .getByRole('button')
      .click()
    await expect(rows(page, /^Hiragana words/).last()).toContainText('aka')
  })

  test('sorts with the menu too, and remembers it', async ({ page }) => {
    await page
      .getByRole('combobox', { name: 'Sort by' })
      .selectOption({ label: 'Word (あいうえお)' })
    expect(await firstWords(page)).toEqual(sorted.slice(0, 3))
    await page.getByRole('button', { name: /^Ascending/ }).click()
    expect(await firstWords(page)).toEqual([...sorted].reverse().slice(0, 3))
    const data = await savedData(page)
    expect(data.settings).toMatchObject({ wordListSort: 'kana', wordListDesc: true })
  })

  test('searches by romaji or meaning; locked words show with Unlocked only off', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox')
    await search.fill('umbrella')
    // かさ is locked (さ isn't known yet): not found while only unlocked words show.
    await expect(page.getByText('No words match.')).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(0)
    await page.getByLabel('Unlocked only').uncheck()
    const kasa = page.locator('tbody tr').filter({
      has: page.locator('td.kana', { hasText: /^かさ$/ }),
    })
    await expect(kasa).toHaveCount(1)
    await expect(kasa).toHaveClass(/locked/)
    await expect(kasa).toContainText('さ')
    await search.fill('aka')
    await expect(page.locator('tbody tr').filter({ hasText: 'red' })).toHaveCount(1)
  })

  test('on a phone a word takes two lines, without scrolling sideways', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    const row = rows(page, /^Hiragana words/).first()
    const [kana, romaji] = await Promise.all([
      row.locator('td.kana').boundingBox(),
      row.locator('td.romaji').boundingBox(),
    ])
    expect(romaji!.y).toBeGreaterThan(kana!.y + kana!.height / 2)
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    expect(wide).toBe(false)
  })
})
