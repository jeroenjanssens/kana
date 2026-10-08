/** Interface text: study view and study-related components. */
export default {
  // Study.svelte — top bar
  'study.leave.label': 'Leave session (Esc)',
  'study.mode.srs': 'Spaced repetition',
  'study.mode.order': 'In order',
  'study.mode.pass': 'In order · pass {n}',
  'study.repeatingTitle': "Cards you're still learning come back in a few minutes",
  // Study.svelte — setup phase
  'study.setup.title': 'Study in order',
  'study.setup.desc':
    "Go through the kana one by one, in table order. This doesn't affect your spaced-repetition schedule.",
  'study.setup.selectAll': 'Select all',
  'study.setup.clear': 'Clear',
  'study.setup.loop': 'Loop',
  'study.setup.start': 'Start · {count} kana',
  // Study.svelte — card controls
  'study.card.showAnswer': 'Show answer',
  'study.card.gradeLabel': 'How well did you know it?',
  'study.card.enterHint': 'Press Enter to accept the suggested grade.',
  'study.card.typePlaceholder': 'Type the romaji…',
  'study.card.typeLabel': 'Your answer in romaji',
  'study.card.checkBtn': 'Check',
  // Study.svelte — in-order nav
  'study.order.prev': 'Previous (←)',
  'study.order.next': 'Next (→)',
  'study.order.missed': 'Missed',
  'study.order.gotIt': 'Got it',
  // Study.svelte — done screen
  'study.done.eyebrow': 'おつかれさま · Well done',
  'study.done.nothingTitle': 'Nothing to study right now',
  'study.done.nothingDesc': "You've done all reviews and new cards for today in this deck.",
  'study.done.nextDueToday': 'The next review is due in {interval}.',
  'study.done.nextDueLater': 'The next review is due on {date}.',
  'study.done.completeTitle': 'Session complete',
  'study.done.cards': 'Cards',
  'study.done.correct': 'Correct',
  'study.done.time': 'Time',
  'study.done.minutes': '{n} min',
  'study.done.backHome': 'Back home',
  'study.done.inOrder': 'Study in order',
  'study.done.table': 'Kana table',
  'study.done.practice': 'Practice',
  // Study.svelte — toasts
  'study.toast.streak': '{n}-day streak — keep it up!',
  'study.toast.leech':
    "You keep forgetting {kana} — it's marked as tricky. Try the hint or a drill.",
  'study.toast.rowMastered': "You've mastered the {row} row! 🎉",
  // Study.svelte — modal titles
  'study.modal.strokeOrder': 'Stroke order',
  'study.modal.fontGallery': 'Font gallery',
  // StrokeOrder component
  'study.strokeOrder.ariaLabel': 'Stroke order for {text}, {n} {n|stroke|strokes}',
  'study.strokeOrder.replayBtn': 'Replay',
  'study.strokeOrder.replay': 'Replay animation',
  'study.strokeOrder.prevStroke': 'Previous stroke',
  'study.strokeOrder.nextStroke': 'Next stroke',
  'study.strokeOrder.numbers': 'Numbers',
  // FontGallery component
  'study.fontGallery.ariaLabel': '{text} in different fonts',
  'study.fontGallery.systemFont': 'System font',
  'study.fontGallery.yourDevice': 'Your device',
  // MasteryBar component
  'study.mastery.mature': 'Mastered',
  'study.mastery.young': 'Young',
  'study.mastery.learning': 'Learning',
  'study.mastery.new': 'New',
  'study.mastery.titleSegment': '{label}: {count} of {total}',
  // FlashCard component
  'study.flashCard.tapHintPre': 'Tap or press ',
  'study.flashCard.new': 'New',
  'study.flashCard.hiraganaAndKatakana': 'Hiragana and katakana',
  'study.flashCard.otherScriptTitle': 'The same sound in the other script',
  'study.flashCard.correct': 'Correct',
  'study.flashCard.youTypedPre': 'You typed ',
  'study.flashCard.drillCompare': 'Compare {title}',
  'study.flashCard.tricky': 'Tricky',
  'study.flashCard.systemFont': 'System font',
  'study.flashCard.mastered': 'Mastered!',
  'study.flashCard.playLabel': 'Play pronunciation (P)',
  'study.flashCard.strokesLabel': 'Stroke order (S)',
  'study.flashCard.fontsLabel': 'Font gallery (F)',
  'study.flashCard.cardLabelFront': '{script} card, tap to reveal',
  'study.flashCard.cardLabelBack': '{script} card, {romaji}',
  // KanaIntro component
  'study.kanaIntro.eyebrow': 'New kana · 新しい字',
  'study.kanaIntro.ariaLabel': 'New kana: {romaji}',
  'study.kanaIntro.gotIt': 'Got it',
  'study.kanaIntro.comesBack': 'It comes back as a quiz in a minute.',
  'study.kanaIntro.playLabel': 'Play pronunciation (P)',
  // Hanko component
  'study.hanko.mastered': 'Mastered',
} as const
