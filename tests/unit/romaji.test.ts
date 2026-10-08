import { describe, expect, test } from 'vitest'
import { macronVariants, romajiVariants } from '../../src/lib/data/romaji'

describe('romajiVariants', () => {
  test.each([
    ['ねこ', ['neko']],
    ['がっこう', ['gakkou']],
    ['コーヒー', ['koohii']],
    ['しゃしん', ['shashin', 'shashinn']],
    ['ちょっと', ['chotto']],
    ['きっぷ', ['kippu']],
    ['フォーク', ['fooku']],
  ])('%s', (kana, expected) => {
    expect(romajiVariants(kana)).toEqual(expect.arrayContaining(expected))
  })

  test('っ before ch can be typed tch or cch', () => {
    expect(romajiVariants('サンドイッチ')).toEqual(
      expect.arrayContaining(['sandoitchi', 'sandoicchi', 'sanndoitchi']),
    )
  })

  test('ん before y can be typed n or nn', () => {
    expect(romajiVariants('ほんや')).toEqual(['honya', 'honnya'])
  })
})

describe('macronVariants', () => {
  test('spells out long vowels', () => {
    expect(macronVariants('gakkō')).toEqual(['gakkou', 'gakkoo', 'gakko'])
    expect(macronVariants('kōhī')).toEqual(
      expect.arrayContaining(['kouhii', 'koohii', 'kohi', 'kouhi']),
    )
  })
  test('drops apostrophes', () => {
    expect(macronVariants("kin'en")).toEqual(['kinen'])
  })
})
