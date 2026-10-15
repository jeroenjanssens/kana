/** Interface text for speaking: the speech test page, Say it, record & compare. Loaded with them. */
export default {
  // ── Speech view and record & compare ────────────────────────────────────────────
  'speech.eyebrow': '話す · Speaking',
  'speech.heading': 'Speaking (test)',
  'speech.lead':
    "Say a kana or word and see exactly what your browser's speech recognition heard. This is a test, to find out how well it works on your device. You can also record yourself and compare with the app's voice.",
  'speech.statusHeading': 'On this device',
  'speech.recognitionYes': 'Speech recognition is available',
  'speech.recognitionNo':
    "Speech recognition isn't available in this browser. Try Safari or Chrome.",
  'speech.recordingYes': 'Recording is available',
  'speech.recordingNo': "Recording isn't available in this browser",
  'speech.privacy':
    'To recognise speech, your browser sends your voice to Apple (Safari) or Google (Chrome). Recordings for comparing stay on this device and are never saved.',
  'speech.tryHeading': 'Try saying',
  'speech.kanaLabel': 'Kana to try',
  'speech.wordsLabel': 'Words to try',
  'speech.otherWords': 'Other words',
  'speech.say': 'Say {text}',
  'speech.listening': 'Listening… tap to stop',
  'speech.recordHint': 'Or record yourself:',
  'speech.resultsHeading': 'What was heard',
  'speech.match': '✓ recognised',
  'speech.noMatch': '✗ heard something else',
  'speech.nothingHeard': 'Nothing was heard.',
  'speech.error.notAllowed':
    'Microphone or speech recognition access was blocked. Allow it in your browser settings (on iPhone: Settings → Safari → Microphone).',
  'speech.error.serviceNotAllowed':
    'Speech recognition is turned off. On iPhone, turn on Dictation (Settings → General → Keyboard) and try again.',
  'speech.error.network':
    "Speech recognition couldn't reach its service. Browsers built on Chrome such as Vivaldi and Brave can't use it: try Safari or Chrome. Otherwise, check your connection.",
  'speech.error.noSpeech': 'Nothing was heard. Speak a little louder or closer to the microphone.',
  'speech.error.audioCapture': 'No microphone was found.',
  'speech.error.language': "This browser can't recognise Japanese.",
  'speech.error.other': 'Speech recognition stopped unexpectedly. Try again.',
  'record.label': 'Record and compare',
  'record.start': 'Record yourself',
  'record.stop': 'Stop',
  'record.compare': 'Compare',
  'record.mine': 'Mine',
  'record.again': 'Again',
  'record.denied': 'Microphone access was blocked. Allow it in your browser settings.',
  'record.failed': "Couldn't record. Is a microphone connected?",

  // ── Offline kana model: Say it and the test page ────────────────────────────────
  'speech.offlineHeading': 'Offline kana model',
  'speech.offlineDesc':
    "The app's own speech model: it knows single kana only, runs on this device and works without internet. Downloaded the first time you use it.",
  'speech.offlineSay': 'Say {text} (offline)',
  'speech.offlineKanaOnly': 'The offline model knows single kana only: pick a kana above.',
  'speech.sourceBrowser': 'browser',
  'speech.sourceOffline': 'offline',
  'say.listening': 'Listening… tap when done',
  'say.thinking': 'Checking…',
  'say.unsupported': "This browser can't record audio for the speech model.",
  'say.error.denied':
    'Microphone access was blocked. Allow it in your browser settings (on iPhone: Settings → Safari → Microphone).',
  'say.error.microphone': "Couldn't use the microphone. Is one connected?",
  'say.error.model':
    "The speech model couldn't be downloaded. Connect to the internet once; after that it works offline.",
  'speak.eyebrow': '発音 · Say it',
  'speak.heading': 'Say it',
  'speak.lead':
    'See a kana, say it out loud, and a speech model tells you what it heard. It runs on your device: nothing you say leaves it. Saying kana never changes your schedule.',
  'speak.privacy':
    'The speech model (a few hundred KB) is downloaded the first time you start, then works offline. It learned from synthetic voices only, so it can be wrong, especially with real voices: take its verdict as a hint.',
  'speak.title': 'Say it · {script}',
  'speak.hear': 'Hear it',
  'speak.say': 'Say it',
  'speak.hint': 'Tap, say the kana, and it stops by itself. Space works too.',
  'speak.nothing': "Didn't catch a kana. Try again, a little louder or closer.",
  'speak.scoreLabel': 'How much it sounded like the kana',
  'speak.soundedLike': 'Sounded like {kana}',
  'speak.soundedLikeLabel': 'Sounded like',
  'speak.heardLabel': 'What it heard',
  'speak.again': 'Say again',
  'speak.doneTitle': 'Done speaking',
}
