import type en from '../en/misc'

export default {
  // Credits.svelte
  'misc.creditsHeading': 'Credits',
  'misc.creditsEyebrow': '感謝 · Bedankt',
  'misc.creditsLead': 'kana is gebouwd op het genereuze werk van deze makers.',
  'misc.pronunciationHeading': 'Uitspraak',
  'misc.pronunciationGeneratedWith': 'Gegenereerd met',
  'misc.femaleVoice': 'vrouwelijke stem',
  'misc.maleVoice': 'mannelijke stem',
  'misc.terms': 'voorwaarden',
  'misc.strokeOrderHeading': 'Pennenstreken',
  'misc.strokeDataFrom': 'Pennenstreepgegevens van',
  'misc.byContributors': 'door Ulrich Apel en bijdragers, gelicentieerd onder',
  'misc.fontsHeading': 'Lettertypen',
  'misc.japaneseFontsFrom': 'Japanse lettertypen van',
  'misc.fontsLicenseNote':
    ', gebruikt onder de SIL Open Font License (Kosugi Maru: Apache 2.0). Interfacetekst gebruikt Inter.',
  'misc.sfxHeading': 'Geluidseffecten',
  'misc.sfxFrom': 'Van',
  'misc.sfxDesc2':
    '(CC0), een aantal gemaakt voor kana, en drie koto-noten geknipt uit een opname van Torsodog op Wikimedia Commons (CC BY 3.0).',
  'misc.photosHeading': "Foto's",
  'misc.allPhotosFrom': "Alle foto's van",
  'misc.photosLicense': ', gebruikt onder de Unsplash Licentie.',

  // NotFound.svelte
  'misc.notFoundTitle': '迷子 · Verdwaald',
  'misc.notFoundText': 'Deze pagina bestaat niet.',
  'misc.backHome': 'Terug naar begin',

  // Shortcuts.svelte
  'misc.shortcutsTitle': 'Sneltoetsen',
  'misc.shortcutReveal': 'Antwoord tonen',
  'misc.shortcutGrade': 'Beoordelen: Opnieuw, Moeilijk, Goed, Makkelijk',
  'misc.shortcutAccept': 'Voorgestelde beoordeling accepteren (getypte antwoorden)',
  'misc.shortcutPlay': 'Uitspraak afspelen',
  'misc.shortcutStrokes': 'Pennenstreken tonen',
  'misc.shortcutFonts': 'Lettertypengalerij tonen',
  'misc.shortcutNav': 'Vorige / volgende kaart (op volgorde)',
  'misc.shortcutMute': 'Geluid dempen of herstellen',
  'misc.shortcutLeave': 'Sessie verlaten',
  'misc.shortcutHelp': 'Deze lijst tonen',

  // SoundToggle.svelte
  'misc.unmuteSfx': 'Geluid aanzetten (M)',
  'misc.muteSfx': 'Geluid dempen (M)',
  'misc.volumeSettings': 'Geluidsinstellingen',
  'misc.volume': 'Volume',
  'misc.soundSettings': 'Geluidsinstellingen',
  'misc.soundEffects': 'Geluidseffecten',
  'misc.effectsVolumeLabel': 'Effectenvolume',
  'misc.pronunciationVolumeLabel': 'Uitspraakvolume',
  'misc.silentMode': 'Stille modus',
  'misc.mutesEverything': 'dempt alles',

  // Background.svelte
  'misc.previousPhoto': 'Vorige foto',
  'misc.nextPhoto': 'Volgende foto',
  'misc.photoBy': 'Foto door',
  'misc.photoOn': 'op',

  // Toasts.svelte
  'misc.dismiss': 'Sluiten',

  // App.svelte – daily goal toast
  'misc.goalToast': 'Dagelijks doel bereikt: {goal} antwoorden. おみごと!',

  // main.ts – PWA toasts
  'misc.newVersionAvailable': 'Een nieuwe versie van kana is beschikbaar',
  'misc.offlineReady': 'kana werkt nu offline',
  'misc.reload': 'Herladen',
} satisfies Record<keyof typeof en, string>
