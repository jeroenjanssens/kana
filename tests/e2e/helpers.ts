import { expect, type Page } from '@playwright/test'

const DAY = 86_400_000

/** A review card that is "young" (interval of a few days) and not due yet. */
export function youngCard(now = Date.now()) {
  return {
    due: now + 3 * DAY,
    stability: 5,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 4,
    learning_steps: 0,
    reps: 3,
    lapses: 0,
    state: 2,
    last_review: now - DAY,
  }
}

/** Seed localStorage with a save file before the app loads. */
export async function seed(page: Page, save: Record<string, unknown>) {
  await page.addInitScript((data) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('kana:save', JSON.stringify({ version: 1, ...data }))
      sessionStorage.setItem('seeded', '1')
    }
  }, save)
}

/** Start without introductions of new kana, for tests about the quiz itself. */
export async function quizOnly(page: Page, save: Record<string, unknown> = {}) {
  const settings = (save.settings as Record<string, unknown> | undefined) ?? {}
  await seed(page, { ...save, settings: { introduce: false, ...settings } })
}

/** Fail the test on uncaught errors. */
export function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return {
    check: () => expect(errors, errors.join('\n')).toEqual([]),
  }
}

/** The saved progress. Saving is debounced, so first save now, as the app does when it's hidden. */
export async function savedData(page: Page) {
  return page.evaluate(() => {
    window.dispatchEvent(new Event('pagehide'))
    return JSON.parse(localStorage.getItem('kana:save') ?? '{}')
  })
}
