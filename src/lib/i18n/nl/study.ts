import type en from '../en/study'

export default {
  // Study.svelte — top bar
  'study.leave.label': 'Sessie verlaten (Esc)',
  'study.mode.srs': 'Gespreide herhaling',
  'study.mode.order': 'Op volgorde',
  'study.mode.pass': 'Op volgorde · ronde {n}',
  'study.repeatingTitle': 'Kaarten die je nog leert, komen over een paar minuten terug',
  // Study.svelte — setup phase
  'study.setup.title': 'Op volgorde studeren',
  'study.setup.desc':
    'Loop de kana één voor één door in tabelvolgorde. Dit heeft geen invloed op je schema voor gespreide herhaling.',
  'study.setup.selectAll': 'Alles selecteren',
  'study.setup.clear': 'Wissen',
  'study.setup.loop': 'Herhalen',
  'study.setup.start': 'Start · {count} kana',
  // Study.svelte — card controls
  'study.card.showAnswer': 'Antwoord tonen',
  'study.card.gradeLabel': 'Hoe goed wist je het?',
  'study.card.enterHint': 'Druk op Enter om de voorgestelde beoordeling te accepteren.',
  'study.card.typePlaceholder': 'Typ de romaji…',
  'study.card.typeLabel': 'Jouw antwoord in romaji',
  'study.card.checkBtn': 'Controleer',
  // Study.svelte — in-order nav
  'study.order.prev': 'Vorige (←)',
  'study.order.next': 'Volgende (→)',
  'study.order.missed': 'Gemist',
  'study.order.gotIt': 'Goed',
  // Study.svelte — done screen
  'study.done.eyebrow': 'おつかれさま · Goed gedaan',
  'study.done.nothingTitle': 'Niets te studeren nu',
  'study.done.nothingDesc':
    'Je hebt alle herhalingen en nieuwe kaarten voor vandaag in dit deck gedaan.',
  'study.done.nextDueToday': 'De volgende herhaling is over {interval}.',
  'study.done.nextDueLater': 'De volgende herhaling is op {date}.',
  'study.done.completeTitle': 'Sessie afgerond',
  'study.done.cards': 'Kaarten',
  'study.done.correct': 'Correct',
  'study.done.time': 'Tijd',
  'study.done.minutes': '{n} min',
  'study.done.backHome': 'Terug naar start',
  'study.done.inOrder': 'Op volgorde studeren',
  'study.done.table': 'Kana-tabel',
  'study.done.practice': 'Oefenen',
  // Study.svelte — toasts
  'study.toast.streak': '{n}-daagse reeks — zo doorgaan!',
  'study.toast.leech':
    'Je blijft {kana} vergeten — het is gemarkeerd als lastig. Probeer de hint of een drill.',
  'study.toast.rowMastered': 'Je beheerst de {row}-rij! 🎉',
  // Study.svelte — modal titles
  'study.modal.strokeOrder': 'Schrijfvolgorde',
  'study.modal.fontGallery': 'Lettertype-galerij',
  // StrokeOrder component
  'study.strokeOrder.ariaLabel': 'Schrijfvolgorde voor {text}, {n} {n|streek|streken}',
  'study.strokeOrder.replayBtn': 'Opnieuw',
  'study.strokeOrder.replay': 'Animatie opnieuw afspelen',
  'study.strokeOrder.prevStroke': 'Vorige streek',
  'study.strokeOrder.nextStroke': 'Volgende streek',
  'study.strokeOrder.numbers': 'Nummers',
  // FontGallery component
  'study.fontGallery.ariaLabel': '{text} in verschillende lettertypen',
  'study.fontGallery.systemFont': 'Systeemlettertype',
  'study.fontGallery.yourDevice': 'Jouw apparaat',
  // MasteryBar component
  'study.mastery.mature': 'Beheerst',
  'study.mastery.young': 'Jong',
  'study.mastery.learning': 'Lerend',
  'study.mastery.new': 'Nieuw',
  'study.mastery.titleSegment': '{label}: {count} van {total}',
  // FlashCard component
  'study.flashCard.tapHintPre': 'Tik of druk op ',
  'study.flashCard.new': 'Nieuw',
  'study.flashCard.hiraganaAndKatakana': 'Hiragana en katakana',
  'study.flashCard.otherScriptTitle': 'Hetzelfde geluid in het andere schrift',
  'study.flashCard.correct': 'Correct',
  'study.flashCard.youTypedPre': 'Je typte ',
  'study.flashCard.drillCompare': 'Vergelijk {title}',
  'study.flashCard.tricky': 'Lastig',
  'study.flashCard.systemFont': 'Systeemlettertype',
  'study.flashCard.mastered': 'Beheerst!',
  'study.flashCard.playLabel': 'Uitspraak afspelen (P)',
  'study.flashCard.strokesLabel': 'Schrijfvolgorde (S)',
  'study.flashCard.fontsLabel': 'Lettertype-galerij (F)',
  'study.flashCard.cardLabelFront': '{script}-kaart, tik om te onthullen',
  'study.flashCard.cardLabelBack': '{script}-kaart, {romaji}',
  // KanaIntro component
  'study.kanaIntro.eyebrow': 'Nieuw kana · 新しい字',
  'study.kanaIntro.ariaLabel': 'Nieuw kana: {romaji}',
  'study.kanaIntro.gotIt': 'Begrepen',
  'study.kanaIntro.comesBack': 'Het komt over een minuutje terug als quiz.',
  'study.kanaIntro.playLabel': 'Uitspraak afspelen (P)',
  // Hanko component
  'study.hanko.mastered': 'Beheerst',
} satisfies Record<keyof typeof en, string>
