/** Interface text: table view and kana details panel. */
export default {
  // Table.svelte – page header & controls
  'table.heading': 'Kana table',
  'table.eyebrow': '五十音図 · Gojūon',
  'table.layout': 'Layout',
  'table.separate': 'Separate',
  'table.combined': 'Combined',
  'table.romajiToggle': 'Romaji',
  'table.masteryToggle': 'Mastery',
  'table.colourByDeck': 'Colour by deck',
  'table.colourMasteryByDeck': 'Colour mastery by deck',
  'table.deckCombined': 'Combined deck',
  'table.deckHiragana': 'Hiragana deck',
  'table.deckKatakana': 'Katakana deck',
  'table.showExtended': 'Show extended katakana',
  'table.hiraganaKatakana': 'Hiragana · Katakana',

  // Table.svelte – kana groups
  'table.groupBasic': 'Basic',
  'table.groupDakuten': 'Dakuten & handakuten',
  'table.groupYoon': 'Yōon',
  'table.groupExtended': 'Extended katakana',

  // Table.svelte – sidebar hint & mastery legend
  'table.tapHintBold': 'Tap a kana',
  'table.tapHintDetail': ' to hear it and see how well you know it.',
  'table.legendLearning': 'Learning',
  'table.legendYoung': 'Young',
  'table.legendMastered': 'Mastered (21+ days)',

  // Table.svelte – modal titles
  'table.strokeOrder': 'Stroke order',
  'table.fontGallery': 'Font gallery',

  // KanaDetails.svelte – level labels
  'table.levelNew': 'Not studied',
  'table.levelLearning': 'Learning',
  'table.levelYoung': 'Young',
  'table.levelMature': 'Mastered',

  // KanaDetails.svelte – close button & deck labels
  'table.closeDetails': 'Close details',
  'table.detailDeckHiragana': 'Hiragana',
  'table.detailDeckKatakana': 'Katakana',
  'table.detailDeckCombined': 'Combined',
  'table.detailDeckListenHiragana': 'Listening (hiragana)',
  'table.detailDeckListenKatakana': 'Listening (katakana)',
  'table.detailDeckWriteHiragana': 'Writing (hiragana)',
  'table.detailDeckWriteKatakana': 'Writing (katakana)',

  // KanaDetails.svelte – card meta
  'table.metaReviews': '{reps} reviews',
  'table.metaLapses': '{lapses} lapses',
  'table.dueIn': 'due in {interval}',
  'table.dueNow': 'due now',
  'table.metaRecall': '{pct}% recall',
} as const
