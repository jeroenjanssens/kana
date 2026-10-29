import { expect, test } from '@playwright/test'
import { savedData, seed, trackErrors, youngCard } from './helpers'

test('confusable pairs: compare then quiz', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./#/drills')
  await page.getByRole('link', { name: /シ ツ/ }).first().click()
  await expect(page.getByText('shi', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Test yourself' }).click()
  const options = page.getByRole('group', { name: 'Which one is it?' }).getByRole('button')
  await expect(options).toHaveCount(2)
  await options.first().click()
  await expect(page.locator('.option.right')).toBeVisible()
  const data = await savedData(page)
  expect(data.log[0]).toMatchObject({ mode: 'confusable', deck: 'katakana' })
  errors.check()
})

test('listening: hear a sound and pick a kana', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./#/listen')
  await page.getByRole('link', { name: /Start/ }).first().click()
  const options = page.getByRole('group', { name: 'Which kana did you hear?' }).getByRole('button')
  await expect(options).toHaveCount(6)
  await options.first().click()
  await expect(page.locator('.option.right')).toBeVisible()
  const data = await savedData(page)
  expect(data.log[0]).toMatchObject({ mode: 'listen', deck: 'listen-hiragana', id: 'a' })
  errors.check()
})

test('reading practice unlocks words from known kana', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./#/reading')
  await expect(page.getByText(/^0 of \d+ words unlocked/)).toBeVisible()

  const known = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko']
  await seed(page, {
    cards: { hiragana: Object.fromEntries(known.map((id) => [id, youngCard()])) },
  })
  await page.reload()
  await expect(page.getByText(/^[1-9]\d* of \d+ words unlocked/)).toBeVisible()
  await page.getByRole('button', { name: 'Start reading' }).click()
  await page.getByRole('button', { name: /Show reading/ }).click()
  await page.getByRole('button', { name: /^Good/ }).click()
  const data = await savedData(page)
  expect(data.log[0]).toMatchObject({ mode: 'reading', correct: true, grade: 3 })
  errors.check()
})

test('cards fit their paper: no scrollbar from the texture', async ({ page }) => {
  // The paper is an oversized rotated layer; it used to make every card face scrollable.
  const known = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko']
  await seed(page, {
    settings: { introduce: false },
    cards: { hiragana: Object.fromEntries(known.map((id) => [id, youngCard()])) },
  })
  const scrolls = (selector: string) =>
    page.locator(selector).evaluate((el) => el.scrollHeight > el.clientHeight + 1)
  await page.goto('./#/reading')
  await page.getByRole('button', { name: 'Start reading' }).click()
  await page.getByRole('button', { name: /Show reading/ }).click()
  await expect(page.locator('.face.back .meaning')).toBeVisible()
  expect(await scrolls('.face.back .content')).toBe(false)
  // A study card's back can be taller than a small window allows: it scrolls, without a bar.
  await page.goto('./#/study/hiragana?mode=order&ids=a,ka')
  await page.getByRole('button', { name: /Show answer/ }).click()
  expect(await scrolls('.face.front .content')).toBe(false)
  const bar = await page
    .locator('.face.back .content')
    .evaluate((el: HTMLElement) => [
      getComputedStyle(el).scrollbarWidth,
      el.offsetWidth - el.clientWidth,
    ])
  expect(bar).toEqual(['none', 0])
})

test('practice hub links to all practice modes', async ({ page }) => {
  await page.goto('./#/practice')
  await expect(page.getByRole('link', { name: /Confusable pairs/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Listening/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Reading practice/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Worksheet/ })).toBeVisible()
})
