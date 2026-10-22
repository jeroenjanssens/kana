import { expect, test } from '@playwright/test'
import { quizOnly } from './helpers'

test('the rules page opens from the menu, and examples play in both voices', async ({ page }) => {
  await quizOnly(page)
  await page.goto('./')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Rules' }).click()
  await expect(page.getByRole('heading', { name: 'Pronunciation rules', level: 1 })).toBeVisible()
  await expect(page.locator('article.rule')).toHaveCount(20)

  const sokuon = page.getByRole('article', { name: /Small っ doubles the next consonant/ })
  const row = sokuon.getByRole('listitem').filter({ hasText: 'きっぷ' })
  // A practice word plays its own recording…
  let request = page.waitForRequest(/audio\/female\/words\/\d{3}\.mp3$/)
  await row.getByRole('button', { name: 'きっぷ · Female' }).click()
  await request
  request = page.waitForRequest(/audio\/male\/words\/\d{3}\.mp3$/)
  await row.getByRole('button', { name: 'きっぷ · Male' }).click()
  await request
  // …and other examples have one of their own.
  request = page.waitForRequest(/audio\/male\/rules\/kitte\.mp3$/)
  await sokuon
    .getByRole('listitem')
    .filter({ hasText: 'kitte' })
    .getByRole('button', { name: /Male/ })
    .click()
  await request
})

test('a kana with a rule links to it', async ({ page }) => {
  await page.goto('./#/table')
  await page.getByRole('button', { name: /^ん/ }).first().click()
  await page.getByRole('link', { name: 'ん is a beat of its own' }).click()
  await expect(page).toHaveURL(/#\/rules\?rule=n$/)
  await expect(page.locator('#rule-n')).toBeInViewport()
})
