import type en from '../en/table'

export default {
  // Table.svelte – page header & controls
  'table.heading': 'Kana-tabel',
  'table.eyebrow': '五十音図 · Gojūon',
  'table.layout': 'Indeling',
  'table.separate': 'Apart',
  'table.combined': 'Gecombineerd',
  'table.romajiToggle': 'Romaji',
  'table.masteryToggle': 'Beheersing',
  'table.colourByDeck': 'Kleur per reeks',
  'table.colourMasteryByDeck': 'Kleur op basis van reeks',
  'table.deckCombined': 'Gecombineerde reeks',
  'table.deckHiragana': 'Hiragana-reeks',
  'table.deckKatakana': 'Katakana-reeks',
  'table.showExtended': 'Uitgebreide katakana tonen',
  'table.hiraganaKatakana': 'Hiragana · Katakana',

  // Table.svelte – kana groups
  'table.groupBasic': 'Basis',
  'table.groupDakuten': 'Dakuten & handakuten',
  'table.groupYoon': 'Yōon',
  'table.groupExtended': 'Uitgebreide katakana',

  // Table.svelte – sidebar hint & mastery legend
  'table.tapHintBold': 'Tik op een kana',
  'table.tapHintDetail': ' om het te horen en te zien hoe goed je het kent.',
  'table.legendLearning': 'Aan het leren',
  'table.legendYoung': 'Jonge kennis',
  'table.legendMastered': 'Gememoreerd (21+ dagen)',

  // Table.svelte – modal titles
  'table.strokeOrder': 'Pennenstreken',
  'table.fontGallery': 'Lettertypengalerij',

  // KanaDetails.svelte – level labels
  'table.levelNew': 'Niet bestudeerd',
  'table.levelLearning': 'Aan het leren',
  'table.levelYoung': 'Jonge kennis',
  'table.levelMature': 'Gememoreerd',

  // KanaDetails.svelte – close button & deck labels
  'table.closeDetails': 'Details sluiten',
  'table.detailDeckHiragana': 'Hiragana',
  'table.detailDeckKatakana': 'Katakana',
  'table.detailDeckCombined': 'Gecombineerd',
  'table.detailDeckListenHiragana': 'Luisteren (hiragana)',
  'table.detailDeckListenKatakana': 'Luisteren (katakana)',
  'table.detailDeckWriteHiragana': 'Schrijven (hiragana)',
  'table.detailDeckWriteKatakana': 'Schrijven (katakana)',

  // KanaDetails.svelte – card meta
  'table.metaReviews': '{reps} herhalingen',
  'table.metaLapses': '{lapses} fouten',
  'table.dueIn': 'over {interval}',
  'table.dueNow': 'nu gepland',
  'table.metaRecall': '{pct}% onthouden',
} satisfies Record<keyof typeof en, string>
