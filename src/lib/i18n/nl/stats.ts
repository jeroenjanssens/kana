import type en from '../en/stats'

export default {
  // Stats.svelte – page header
  'stats.heading': 'Statistieken',
  'stats.eyebrow': '記録 · Voortgang',

  // Stats.svelte – streak tile
  'stats.streakUnit': '{n|dag|dagen} op rij',
  'stats.longest': 'Langste: {n}',

  // Stats.svelte – mastery tile
  'stats.mastered': 'gememoreerd',
  'stats.masteredOf': 'van {total} kaarten',

  // Stats.svelte – answers tile
  'stats.answers': 'antwoorden',
  'stats.correctPct': '{pct}% correct',

  // Stats.svelte – due tile
  'stats.dueToday': 'vandaag verwacht',
  'stats.dueNextWeek': '{n} in de komende 7 dagen',

  // Stats.svelte – sections
  'stats.activity': 'Activiteit',
  'stats.dueNextTwoWeeks': 'Verwacht in de komende twee weken',
  'stats.masteryPerDeck': 'Beheersing per reeks',

  // Stats.svelte – weakest kana
  'stats.weakestKana': 'Zwakste kana',
  'stats.drillThese': 'Oefenen ({deck})',
  'stats.studyFirst': 'Studeer een beetje en je lastigste kana verschijnt hier.',
  'stats.accuracy': 'Nauwkeurigheid',

  // Stats.svelte – tricky kana
  'stats.trickyKana': 'Lastige kana',
  'stats.trickyDesc': '{threshold} keer of vaker vergeten. Oefen ze op volgorde, met de hints.',
  'stats.trickyForgotten': '{lapses}× vergeten',
  'stats.drillTricky': 'Lastige kana oefenen ({deck})',

  // Stats.svelte – most confused
  'stats.mostConfused': 'Meest verward',
  'stats.practiceConfusable': 'Verwarrende paren oefenen',
  'stats.noMixups':
    'Verwarringen uit getypte antwoorden, luisteren en oefeningen verschijnen hier.',

  // Stats.svelte – slowest
  'stats.slowest': 'Traagst herkend',

  // Heatmap.svelte
  'stats.answersInLastYear': '{total} antwoorden het afgelopen jaar',
  'stats.answersOnDay': '{count} {count|antwoord|antwoorden} op {date}',
  'stats.less': 'Minder',
  'stats.more': 'Meer',

  // Forecast.svelte
  'stats.nothingScheduled':
    'Nog niets gepland — studeer een paar kaarten en hun herhalingen verschijnen hier.',
  'stats.reviewsDue': 'Verwachte herhalingen: {counts}',
  'stats.today': 'Vandaag',
  'stats.tomorrow': 'Morgen',
} satisfies Record<keyof typeof en, string>
