import { describe, expect, test } from 'vitest'
import { format, placeholders, resolveLang } from '../../src/lib/i18n/format'
import { messages } from '../../src/lib/i18n/messages'

describe('format', () => {
  test('fills in placeholders', () => {
    expect(format('{count} left', { count: 3 })).toBe('3 left')
    expect(format('Hello {name}', {})).toBe('Hello {name}')
  })
  test('chooses singular or plural forms', () => {
    expect(format('{n} {n|day|days}', { n: 1 })).toBe('1 day')
    expect(format('{n} {n|day|days}', { n: 2 })).toBe('2 days')
    expect(format('{n} {n|dag|dagen}', { n: 0 })).toBe('0 dagen')
  })
  test('placeholders', () => {
    expect(placeholders('{a} and {b|x|y} and {a}')).toEqual(['a', 'b'])
  })
})

describe('resolveLang', () => {
  test('follows the setting, or the browser for "system"', () => {
    expect(resolveLang('nl')).toBe('nl')
    expect(resolveLang('en', ['nl-NL'])).toBe('en')
    expect(resolveLang('system', ['nl-BE', 'en'])).toBe('nl')
    expect(resolveLang('system', ['de-DE', 'en-GB'])).toBe('en')
  })
})

describe('translations', () => {
  test('Dutch has every English message, with the same placeholders', () => {
    for (const [key, english] of Object.entries(messages.en)) {
      const dutch = messages.nl[key as keyof typeof messages.nl]
      expect(dutch, key).toBeTruthy()
      expect(placeholders(dutch), key).toEqual(placeholders(english))
    }
    expect(Object.keys(messages.nl).sort()).toEqual(Object.keys(messages.en).sort())
  })
})
