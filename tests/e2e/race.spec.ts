import { expect, test, type Page } from '@playwright/test'
import { KANA } from '../../src/lib/data/kana'
import { quizOnly, savedData, trackErrors, youngCard } from './helpers'

/** Romaji of the basic kana in both scripts. */
const ROMAJI: Record<string, string> = Object.fromEntries(
  KANA.filter((k) => k.group === 'basic').flatMap((k) => [
    [k.hiragana, k.romaji],
    [k.katakana, k.romaji],
  ]),
)

const glyph = async (page: Page) => (await page.locator('.question .glyph').textContent())!.trim()

async function chooseRow(page: Page, kana: string) {
  await page
    .getByRole('group', { name: 'Which kana' })
    .getByRole('button', { name: 'Choose rows' })
    .click()
  await page.getByRole('button', { name: 'Clear' }).click()
  await page.locator('.row-chip', { hasText: kana }).click()
  await page.getByLabel('Random order').uncheck()
}

test('a race through one row, then through the missed ones', async ({ page, isMobile }) => {
  test.skip(isMobile, 'typing version')
  const errors = trackErrors(page)
  await quizOnly(page)
  await page.goto('./#/race')
  // Nothing studied yet: "Seen so far" is empty.
  await expect(page.getByText("You haven't studied any of these kana yet.")).toBeVisible()
  await expect(page.getByRole('button', { name: /Race 0 kana/ })).toBeDisabled()

  await chooseRow(page, 'あ')
  await page.getByRole('button', { name: /Race 5 kana/ }).click()
  await expect(page.getByLabel('Progress')).toHaveText('1 / 5')
  const input = page.getByRole('textbox', { name: 'Romaji' })
  for (const [char, typed] of [
    ['あ', 'a'],
    ['い', 'i'],
    ['う', 'ka'],
    ['え', 'e'],
    ['お', 'o'],
  ]) {
    await expect(page.locator('.question .glyph')).toHaveText(char)
    await expect(input).toBeEnabled()
    await input.pressSequentially(typed)
  }
  await expect(page.getByRole('heading', { name: /^5 kana in 0:\d\d\.\d$/ })).toBeVisible()
  await expect(page.getByText(/1 mistake/)).toBeVisible()
  await expect(page.getByText('Your first race with these kana')).toBeVisible()
  await expect(page.locator('.review li')).toHaveCount(1)

  await page.getByRole('button', { name: 'Race the missed ones' }).click()
  await expect(page.getByLabel('Progress')).toHaveText('1 / 1')
  await expect(page.locator('.question .glyph')).toHaveText('う')
  await input.pressSequentially('u')
  await expect(page.getByRole('heading', { name: /^1 kana in / })).toBeVisible()

  const data = await savedData(page)
  expect(Object.keys(data.races)).toHaveLength(2)
  const answers = data.log.filter((e: { mode: string }) => e.mode === 'race')
  expect(answers).toHaveLength(6)
  expect(answers[2]).toMatchObject({ id: 'u', deck: 'hiragana', correct: false, answer: 'ka' })
  expect(data.settings).toMatchObject({
    raceKana: 'rows',
    raceRows: ['basic:a'],
    raceShuffle: false,
  })
  errors.check()
})

test('a race through the kana seen so far in both scripts', async ({ page, isMobile }) => {
  test.skip(isMobile, 'typing version')
  await quizOnly(page, { cards: { hiragana: { a: youngCard() }, katakana: { ka: youngCard() } } })
  await page.goto('./#/race')
  await page.getByRole('group', { name: 'Script' }).getByRole('button', { name: 'Both' }).click()
  await page.getByLabel('Random order').uncheck()
  await page.getByRole('button', { name: /Race 2 kana/ }).click()
  await expect(page.locator('.topbar strong')).toHaveText('Race · Hiragana + Katakana')
  const input = page.getByRole('textbox', { name: 'Romaji' })
  await expect(page.locator('.question .glyph')).toHaveText('あ')
  await input.pressSequentially('a')
  await expect(page.locator('.question .glyph')).toHaveText('カ')
  await input.pressSequentially('ka')
  await expect(page.getByRole('heading', { name: /^2 kana in / })).toBeVisible()
  const data = await savedData(page)
  const decks = data.log
    .filter((e: { mode: string }) => e.mode === 'race')
    .map((e: { deck: string }) => e.deck)
  expect(decks).toEqual(['hiragana', 'katakana'])
})

test('on phones the race is answered with buttons', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch version')
  await quizOnly(page)
  await page.goto('./#/race')
  await chooseRow(page, 'あ')
  await page.getByRole('button', { name: /Race 5 kana/ }).click()
  const options = page.getByRole('group', { name: 'Which romaji?' }).getByRole('button')
  for (let i = 0; i < 5; i++) {
    await expect(page.getByLabel('Progress')).toHaveText(`${i + 1} / 5`)
    await expect(options).toHaveCount(4)
    await options.filter({ hasText: new RegExp(`^${ROMAJI[await glyph(page)]}$`) }).click()
  }
  await expect(page.getByRole('heading', { name: /^5 kana in / })).toBeVisible()
})
