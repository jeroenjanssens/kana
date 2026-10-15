import { expect, test, type Page } from '@playwright/test'
import { referenceStrokes, resample, type Point } from '../../src/lib/study/handwriting'
import { KANA } from '../../src/lib/data/kana'
import { strokesFor } from '../../src/lib/data/strokes'
import { quizOnly, savedData } from './helpers'

/** Draw strokes (in the 109-unit KanjiVG grid) on the writing pad with the mouse. */
async function drawOnPad(page: Page, strokes: Point[][]) {
  const pad = page.getByRole('img', { name: /Drawing area/ })
  // Wait for the card's slide-in to finish: tracing scores depend on where the strokes land.
  let box = (await pad.boundingBox())!
  await expect(async () => {
    const before = box
    await page.waitForTimeout(50)
    box = (await pad.boundingBox())!
    expect(box).toEqual(before)
  }).toPass()
  const scale = box.height / 109
  for (const stroke of strokes) {
    const pts = resample(stroke, 14)
    await page.mouse.move(box.x + pts[0][0] * scale, box.y + pts[0][1] * scale)
    await page.mouse.down()
    for (const [x, y] of pts.slice(1)) await page.mouse.move(box.x + x * scale, box.y + y * scale)
    await page.mouse.up()
  }
}

test('touching the writing pad never scrolls the page', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch')
  await quizOnly(page)
  await page.goto('./#/write/hiragana')
  const pad = page.getByRole('img', { name: /Drawing area/ })
  await expect(pad).toBeVisible()
  // iOS Safari scrolls unless the touches themselves are cancelled (touch-action isn't enough).
  const cancelled = (el: Element) => {
    const touch = new Touch({ identifier: 1, target: el, clientX: 10, clientY: 10 })
    const results: boolean[] = []
    for (const type of ['touchstart', 'touchmove']) {
      const e = new TouchEvent(type, { touches: [touch], cancelable: true, bubbles: true })
      el.dispatchEvent(e)
      results.push(e.defaultPrevented)
    }
    return results
  }
  expect(await pad.evaluate(cancelled)).toEqual([true, true])
  expect(await page.locator('h1, .topbar').first().evaluate(cancelled)).toEqual([false, false])
})

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
  const wrong = (await page.locator('.question .glyph').textContent())!.trim()
  await input.pressSequentially('q')
  await page.clock.runFor(61_000)
  await expect(page.getByRole('heading', { name: '3 kana in one minute' })).toBeVisible()
  const missed = page.locator('.review li')
  await expect(missed).toHaveCount(1)
  await expect(missed.locator('.wrong')).toHaveText('q')
  await expect(missed.locator('strong')).toHaveText(ROMAJI[wrong])
  await missed.getByRole('button').click()
  await expect(page.locator('article.details')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('article.details')).toBeHidden()
  await expect(page.getByRole('heading', { name: '3 kana in one minute' })).toBeVisible()
  const data = await savedData(page)
  expect(data.sprints.hiragana[0].score).toBe(3)
  expect(data.log.filter((e: { mode: string }) => e.mode === 'sprint')).toHaveLength(4)
})

/** Romaji of the basic hiragana, for the sprint test (the pool is the basic kana). */
const ROMAJI: Record<string, string> = Object.fromEntries(
  KANA.filter((k) => k.group === 'basic').map((k) => [k.hiragana, k.romaji]),
)

test('a sprint shows each kana in a font from the random rotation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'typing version')
  const fonts = ['klee-one', 'yomogi']
  await quizOnly(page, { settings: { fontMode: 'random', randomFonts: fonts } })
  await page.goto('./#/sprint/hiragana')
  await page.getByRole('button', { name: /Start/ }).click()
  const input = page.getByRole('textbox', { name: 'Romaji' })
  const seen = new Set<string>()
  for (let i = 0; i < 4; i++) {
    const glyph = page.locator('.question .glyph')
    seen.add(await glyph.evaluate((el) => (el as HTMLElement).style.fontFamily))
    await input.pressSequentially(ROMAJI[(await glyph.textContent())!.trim()])
    await expect(page.getByLabel('Score')).toHaveText(String(i + 1))
  }
  // Two fonts, never the same one twice in a row.
  expect(seen.size).toBe(2)
})

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

test('tracing over a faint guide, without touching the schedule', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./#/trace')
  await page.getByRole('button', { name: 'Clear' }).click()
  await page.locator('.row-chip', { hasText: 'あ' }).click()
  await page.getByRole('button', { name: /Start · 5 kana/ }).click()
  for (const char of ['あ', 'い', 'う', 'え', 'お']) {
    // The guide: every stroke, with its number and a dot where it starts.
    const n = strokesFor(char)[0].strokes.length
    await expect(page.locator('.guide path')).toHaveCount(n)
    await expect(page.locator('.guide circle')).toHaveCount(n)
    await expect(page.locator('.guide text')).toHaveText(
      Array.from({ length: n }, (_, i) => `${i + 1}`),
    )
    if (char === 'い') {
      // A wrong first try, then tracing it again.
      await drawOnPad(page, [
        [
          [20, 20],
          [90, 90],
        ],
      ])
      await page.getByRole('button', { name: /Check/ }).click()
      await expect(page.locator('.verdict')).not.toHaveText('Correct!')
      await expect(page.getByLabel('How closely you followed the guide')).toHaveText(
        /^\d%|^[1-5]\d%/,
      )
      await page.getByRole('button', { name: /Trace again/ }).click()
    }
    await drawOnPad(page, referenceStrokes(strokesFor(char)))
    await page.getByRole('button', { name: /Check/ }).click()
    await expect(page.locator('.verdict')).toHaveText('Correct!')
    await expect(page.getByLabel('How closely you followed the guide')).toHaveText(/^(9\d|100)%$/)
    await page.getByRole('button', { name: /^Next Enter/ }).click()
  }
  await expect(page.getByRole('heading', { name: 'Done tracing' })).toBeVisible()
  await expect(page.locator('.done p')).toHaveText(
    /^4 of 5 right the first time\.\s+Average score: (9\d|100)%\.$/,
  )
  await expect(page.locator('.review li')).toHaveText(['い i'])
  const data = await savedData(page)
  expect(data.cards).toEqual({})
  expect(data.log).toHaveLength(6)
  expect(data.log.every((e: { mode: string }) => e.mode === 'trace')).toBe(true)
})
