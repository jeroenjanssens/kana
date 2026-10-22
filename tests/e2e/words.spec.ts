import { expect, test } from '@playwright/test'
import { words } from '../../src/lib/data/words'
import { savedData, seed, trackErrors, youngCard } from './helpers'

const KNOWN = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko']
/** The words these kana unlock. */
const UNLOCKED = words.filter((w) => /^[あいうえおかきくけこ]+$/.test(w.kana))
const KIKU = words.find((w) => w.kana === 'きく')!

test('every word in the list opens its card, with rules, sound and kana', async ({ page }) => {
  const errors = trackErrors(page)
  await seed(page, {
    cards: { hiragana: Object.fromEntries(KNOWN.map((id) => [id, youngCard()])) },
    words: { きく: { seen: 3, correct: 2, last: 1 } },
  })
  await page.goto('./#/reading')
  await page.getByRole('button', { name: /^きく: kiku/ }).click()
  const card = page.getByRole('article', { name: 'きく' })
  await expect(card.getByText('kiku', { exact: true })).toBeVisible()
  await expect(card.getByText('Seen 3 times, read correctly 2 times.')).toBeVisible()

  // Both voices.
  const file = String(KIKU.index).padStart(3, '0')
  let request = page.waitForRequest(new RegExp(`audio/female/words/${file}\\.mp3$`))
  await card.getByRole('button', { name: 'きく · Female' }).click()
  await request
  request = page.waitForRequest(new RegExp(`audio/male/words/${file}\\.mp3$`))
  await card.getByRole('button', { name: 'きく · Male' }).click()
  await request

  // Its rule, opened and linked to the rules page.
  await card.getByText('Vowels that go silent').click()
  await expect(card.getByText(/です sounds like “des”/)).toBeVisible()
  // And its kana, each with its details.
  await card.getByRole('button', { name: /^く/ }).click()
  await expect(card.locator('article.details')).toBeVisible()
  await card.getByRole('link', { name: 'More about this rule' }).click()
  await expect(page).toHaveURL(/#\/rules\?rule=devoicing$/)
  errors.check()
})

test('a word to unlock says which kana are still needed', async ({ page }) => {
  await page.goto('./#/reading')
  await page.locator('.next button.word').first().click()
  await expect(page.getByText('To unlock this word, learn:')).toBeVisible()
})

test('after answering, the back shows the rules in the word', async ({ page }) => {
  // Every other word has been practised a lot, so きく comes first.
  const practised = Object.fromEntries(
    UNLOCKED.filter((w) => w !== KIKU).map((w) => [w.kana, { seen: 20, correct: 20, last: 1 }]),
  )
  await seed(page, {
    settings: { autoplay: false },
    cards: { hiragana: Object.fromEntries(KNOWN.map((id) => [id, youngCard()])) },
    words: practised,
  })
  await page.goto('./#/reading')
  await page.getByRole('button', { name: 'Start reading' }).click()
  await page.getByRole('button', { name: /Show reading/ }).click()
  const rules = page.getByRole('complementary').filter({ hasText: 'Rules in this word' })
  // Met for the first time: its explanation is open.
  await expect(rules.getByText(/です sounds like “des”/)).toBeVisible()
  const data = await savedData(page)
  expect(data.seenNotes).toContain('devoicing')
})
