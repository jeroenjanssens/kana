import type en from '../en/speech'

export default {
  // ── Speech view and record & compare ────────────────────────────────────────────
  'speech.eyebrow': '話す · Spreken',
  'speech.heading': 'Spreken (test)',
  'speech.lead':
    'Zeg een kana of woord en zie precies wat de spraakherkenning van je browser hoorde. Dit is een test om uit te vinden hoe goed het werkt op je apparaat. Je kunt jezelf ook opnemen en vergelijken met de stem van de app.',
  'speech.statusHeading': 'Op dit apparaat',
  'speech.recognitionYes': 'Spraakherkenning is beschikbaar',
  'speech.recognitionNo':
    'Spraakherkenning is niet beschikbaar in deze browser. Probeer Safari of Chrome.',
  'speech.recordingYes': 'Opnemen is beschikbaar',
  'speech.recordingNo': 'Opnemen is niet beschikbaar in deze browser',
  'speech.privacy':
    'Om spraak te herkennen stuurt je browser je stem naar Apple (Safari) of Google (Chrome). Opnames om te vergelijken blijven op dit apparaat en worden nooit bewaard.',
  'speech.tryHeading': 'Probeer te zeggen',
  'speech.kanaLabel': 'Kana om te proberen',
  'speech.wordsLabel': 'Woorden om te proberen',
  'speech.otherWords': 'Andere woorden',
  'speech.say': 'Zeg {text}',
  'speech.listening': 'Luistert… tik om te stoppen',
  'speech.recordHint': 'Of neem jezelf op:',
  'speech.resultsHeading': 'Wat er gehoord werd',
  'speech.match': '✓ herkend',
  'speech.noMatch': '✗ iets anders gehoord',
  'speech.nothingHeard': 'Er werd niets gehoord.',
  'speech.error.notAllowed':
    'Toegang tot de microfoon of spraakherkenning is geblokkeerd. Sta het toe in je browserinstellingen (op iPhone: Instellingen → Safari → Microfoon).',
  'speech.error.serviceNotAllowed':
    'Spraakherkenning staat uit. Zet op iPhone Dicteren aan (Instellingen → Algemeen → Toetsenbord) en probeer het opnieuw.',
  'speech.error.network':
    'Spraakherkenning kon zijn dienst niet bereiken. Browsers die op Chrome gebouwd zijn, zoals Vivaldi en Brave, kunnen het niet gebruiken: probeer Safari of Chrome. Controleer anders je verbinding.',
  'speech.error.noSpeech': 'Er werd niets gehoord. Spreek iets luider of dichter bij de microfoon.',
  'speech.error.audioCapture': 'Er is geen microfoon gevonden.',
  'speech.error.language': 'Deze browser kan geen Japans herkennen.',
  'speech.error.other': 'Spraakherkenning stopte onverwacht. Probeer het opnieuw.',
  'record.label': 'Opnemen en vergelijken',
  'record.start': 'Neem jezelf op',
  'record.stop': 'Stop',
  'record.compare': 'Vergelijk',
  'record.mine': 'De mijne',
  'record.again': 'Opnieuw',
  'record.denied':
    'Toegang tot de microfoon is geblokkeerd. Sta het toe in je browserinstellingen.',
  'record.failed': 'Opnemen lukte niet. Is er een microfoon aangesloten?',

  // ── Offline kana model: Say it and the test page ────────────────────────────────
  'speech.offlineHeading': 'Offline kanamodel',
  'speech.offlineDesc':
    'Het eigen spraakmodel van de app: het kent alleen losse kana, draait op dit apparaat en werkt zonder internet. Wordt gedownload als je het voor het eerst gebruikt.',
  'speech.offlineSay': 'Zeg {text} (offline)',
  'speech.offlineKanaOnly': 'Het offline model kent alleen losse kana: kies hierboven een kana.',
  'speech.sourceBrowser': 'browser',
  'speech.sourceOffline': 'offline',
  'say.listening': 'Luistert… tik als je klaar bent',
  'say.thinking': 'Controleren…',
  'say.unsupported': 'Deze browser kan geen geluid opnemen voor het spraakmodel.',
  'say.error.denied':
    'Toegang tot de microfoon is geblokkeerd. Sta het toe in je browserinstellingen (op iPhone: Instellingen → Safari → Microfoon).',
  'say.error.microphone': 'De microfoon kon niet gebruikt worden. Is er een aangesloten?',
  'say.error.model':
    'Het spraakmodel kon niet gedownload worden. Maak één keer verbinding met internet; daarna werkt het offline.',
  'speak.eyebrow': '発音 · Zeg het',
  'speak.heading': 'Zeg het',
  'speak.lead':
    'Zie een kana, zeg het hardop, en een spraakmodel vertelt wat het hoorde. Het draait op je apparaat: niets van wat je zegt verlaat het. Kana uitspreken verandert nooit je schema.',
  'speak.privacy':
    'Het spraakmodel (een paar honderd KB) wordt gedownload als je voor het eerst begint en werkt daarna offline. Het leerde alleen van synthetische stemmen en kan zich dus vergissen, vooral bij echte stemmen: zie het oordeel als een hint.',
  'speak.title': 'Zeg het · {script}',
  'speak.hear': 'Luister',
  'speak.say': 'Zeg het',
  'speak.hint': 'Tik, zeg de kana, en het stopt vanzelf. De spatiebalk werkt ook.',
  'speak.nothing': 'Geen kana gehoord. Probeer het nog eens, iets luider of dichterbij.',
  'speak.scoreLabel': 'Hoeveel het op de kana leek',
  'speak.soundedLike': 'Klonk als {kana}',
  'speak.soundedLikeLabel': 'Klonk als',
  'speak.heardLabel': 'Wat het hoorde',
  'speak.again': 'Nog een keer',
  'speak.doneTitle': 'Klaar met spreken',
} satisfies Record<keyof typeof en, string>
