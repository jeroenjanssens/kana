import { expect, test, type Page } from '@playwright/test'
import { referenceStrokes, resample, type Point } from '../../src/lib/study/handwriting'
import { KANA } from '../../src/lib/data/kana'
import { strokesFor } from '../../src/lib/data/strokes'
import { quizOnly, savedData } from './helpers'

/** Draw strokes (in the 109-unit KanjiVG grid) on the writing pad with the mouse. */
async function drawOnPad(page: Page, strokes: Point[][]) {
  const pad = page.getByRole('img', { name: /Drawing area/ })
  const box = (await pad.boundingBox())!
  const scale = box.height / 109
  for (const stroke of strokes) {
    const pts = resample(stroke, 14)
    await page.mouse.move(box.x + pts[0][0] * scale, box.y + pts[0][1] * scale)
    await page.mouse.down()
    for (const [x, y] of pts.slice(1)) await page.mouse.move(box.x + x * scale, box.y + y * scale)
    await page.mouse.up()
  }
}

test('writing あ stroke by stroke is accepted', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/write/hiragana')
  await expect(page.locator('.romaji')).toHaveText('a')
  await drawOnPad(page, referenceStrokes(strokesFor('あ')))
  await expect(page.getByRole('img', { name: 'Drawing area: 3 strokes drawn' })).toBeVisible()
  await page.getByRole('button', { name: /Check/ }).click()
  await expect(page.locator('.verdict')).toHaveText('Correct!')
  await expect(page.locator('.grade.suggested')).toBeVisible()
  await page.getByRole('button', { name: /Good/ }).click()
  const data = await savedData(page)
  expect(data.log[0]).toMatchObject({
    mode: 'write',
    deck: 'write-hiragana',
    id: 'a',
    correct: true,
  })
})

test('a stroke drawn the wrong way round is explained', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/write/katakana')
  const strokes = referenceStrokes(strokesFor('ア'))
  strokes[1] = [...strokes[1]].reverse()
  await drawOnPad(page, strokes)
  await page.getByRole('button', { name: /Check/ }).click()
  await expect(page.locator('.verdict')).toHaveText('Stroke 2 goes the other way.')
  await expect(page.locator('.grade.suggested')).toHaveText(/Again/)
})

test('the strokes can be cleared and undone before checking', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/write/hiragana')
  await drawOnPad(page, referenceStrokes(strokesFor('あ')))
  await page.getByRole('button', { name: 'Undo stroke' }).click()
  await expect(page.getByRole('img', { name: 'Drawing area: 2 strokes drawn' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear drawing' }).click()
  await expect(page.getByRole('img', { name: 'Drawing area: 0 strokes drawn' })).toBeVisible()
})

test('choosing instead of drawing', async ({ page }) => {
  await quizOnly(page, { settings: { writeStyle: 'choose' } })
  await page.goto('./#/write/hiragana')
  const options = page.getByRole('group', { name: 'Which kana is it?' }).getByRole('button')
  await expect(options).toHaveCount(6)
  await options.filter({ hasText: 'あ' }).click()
  await expect(page.locator('.option.right')).toBeVisible()
  const data = await savedData(page)
  expect(data.log[0]).toMatchObject({ mode: 'write', deck: 'write-hiragana', correct: true })
})

test('a one-minute sprint counts correct answers and keeps the best score', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'typing version')
  await page.clock.install()
  await page.goto('./#/sprint/hiragana')
  await page.getByRole('button', { name: /Start/ }).click()
  const input = page.getByRole('textbox', { name: 'Romaji' })
  for (let i = 0; i < 3; i++) {
    const kana = (await page.locator('.question .glyph').textContent())!.trim()
    await input.pressSequentially(ROMAJI[kana])
    await expect(page.getByLabel('Score')).toHaveText(String(i + 1))
  }
  await input.pressSequentially('q')
  await page.clock.runFor(61_000)
  await expect(page.getByRole('heading', { name: '3 kana in one minute' })).toBeVisible()
  const data = await savedData(page)
  expect(data.sprints.hiragana[0].score).toBe(3)
  expect(data.log.filter((e: { mode: string }) => e.mode === 'sprint')).toHaveLength(4)
})

/** Romaji of the basic hiragana, for the sprint test (the pool is the basic kana). */
const ROMAJI: Record<string, string> = Object.fromEntries(
  KANA.filter((k) => k.group === 'basic').map((k) => [k.hiragana, k.romaji]),
)

test('on phones the sprint is answered with buttons', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch version')
  await page.goto('./#/sprint/katakana')
  await page.getByRole('button', { name: /Start/ }).click()
  const options = page.getByRole('group', { name: 'Which romaji?' }).getByRole('button')
  await expect(options).toHaveCount(4)
  const kana = (await page.locator('.question .glyph').textContent())!.trim()
  const romaji = KANA.find((k) => k.katakana === kana)!.romaji
  await options
    .filter({ hasText: new RegExp(`^${romaji}`) })
    .first()
    .click()
  await expect(page.getByLabel('Score')).toHaveText('1')
})
