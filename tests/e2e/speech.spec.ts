import { expect, test } from '@playwright/test'

/** Replace speech recognition with a fake that "hears" the given guesses, or fails. */
async function fakeRecognition(page: import('@playwright/test').Page, heard: string[] | string) {
  await page.addInitScript((heard) => {
    class Fake {
      lang = ''
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: { error: string }) => void) | null = null
      onend: (() => void) | null = null
      start() {
        setTimeout(() => {
          if (typeof heard === 'string') this.onerror?.({ error: heard })
          else {
            const alts = Object.assign(
              heard.map((transcript) => ({ transcript, confidence: 0.9 })),
              { isFinal: true },
            )
            this.onresult?.({ results: [alts] })
          }
          this.onend?.()
        }, 50)
      }
      stop() {}
      abort() {}
    }
    const w = window as unknown as { webkitSpeechRecognition: unknown; SpeechRecognition: unknown }
    w.webkitSpeechRecognition = w.SpeechRecognition = Fake
  }, heard)
}

test('saying a kana shows what was heard and whether it matches', async ({ page }) => {
  await fakeRecognition(page, ['酢', 'ス'])
  await page.goto('./#/speech')
  await expect(page.getByText('Speech recognition is available')).toBeVisible()
  await page.getByRole('group', { name: 'Kana to try' }).getByRole('button', { name: 'す' }).click()
  await page.getByRole('button', { name: 'Say す', exact: true }).click()
  const results = page.locator('.results')
  await expect(results.getByText('✓ recognised')).toBeVisible()
  await expect(results.getByText('「酢」')).toBeVisible()
  await expect(results.getByText('→ す')).toBeVisible()
})

test('explains why recognition fails in browsers like Vivaldi', async ({ page }) => {
  await fakeRecognition(page, 'network')
  await page.goto('./#/speech')
  await page.getByRole('button', { name: /^Say [^ ]+$/ }).click()
  await expect(page.getByRole('alert')).toContainText('Vivaldi and Brave')
})

test('without speech recognition the page says so', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
  })
  await page.goto('./#/speech')
  await expect(page.getByText(/Speech recognition isn't available/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Say [^ ]+$/ })).toHaveCount(0)
})
