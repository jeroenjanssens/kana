/** Interface text: stats view and chart components. */
export default {
  // Stats.svelte – page header
  'stats.heading': 'Stats',
  'stats.eyebrow': '記録 · Progress',

  // Stats.svelte – streak tile
  'stats.streakUnit': '{n|day|days} streak',
  'stats.longest': 'Longest: {n}',

  // Stats.svelte – mastery tile
  'stats.mastered': 'mastered',
  'stats.masteredOf': 'of {total} cards',

  // Stats.svelte – answers tile
  'stats.answers': 'answers',
  'stats.correctPct': '{pct}% correct',

  // Stats.svelte – due tile
  'stats.dueToday': 'due today',
  'stats.dueNextWeek': '{n} in the next 7 days',

  // Stats.svelte – sections
  'stats.activity': 'Activity',
  'stats.dueNextTwoWeeks': 'Due in the next two weeks',
  'stats.masteryPerDeck': 'Mastery per deck',

  // Stats.svelte – weakest kana
  'stats.weakestKana': 'Weakest kana',
  'stats.drillThese': 'Drill these ({deck})',
  'stats.studyFirst': 'Study a little and your trickiest kana will show up here.',
  'stats.accuracy': 'Accuracy',

  // Stats.svelte – tricky kana
  'stats.trickyKana': 'Tricky kana',
  'stats.trickyDesc': 'Forgotten {threshold} times or more. Drill them in order, with their hints.',
  'stats.trickyForgotten': 'forgotten {lapses}×',
  'stats.drillTricky': 'Drill tricky kana ({deck})',

  // Stats.svelte – most confused
  'stats.mostConfused': 'Most confused',
  'stats.practiceConfusable': 'Practise confusable pairs',
  'stats.noMixups': 'Mix-ups from typed answers, listening and drills appear here.',

  // Stats.svelte – slowest
  'stats.slowest': 'Slowest to recognise',

  // Heatmap.svelte
  'stats.answersInLastYear': '{total} answers in the last year',
  'stats.answersOnDay': '{count} {count|answer|answers} on {date}',
  'stats.less': 'Less',
  'stats.more': 'More',

  // Forecast.svelte
  'stats.nothingScheduled':
    'Nothing scheduled yet — study a few cards and their reviews will show up here.',
  'stats.reviewsDue': 'Reviews due: {counts}',
  'stats.today': 'Today',
  'stats.tomorrow': 'Tmrw',
} as const
