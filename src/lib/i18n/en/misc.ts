/** Interface text: misc views and components (credits, shortcuts, sound, background, toasts). */
export default {
  // Credits.svelte
  'misc.creditsHeading': 'Credits',
  'misc.creditsEyebrow': '感謝 · Thanks',
  'misc.creditsLead': 'kana is built on the generous work of these creators.',
  'misc.pronunciationHeading': 'Pronunciation',
  'misc.pronunciationGeneratedWith': 'Generated with',
  'misc.femaleVoice': 'female voice',
  'misc.maleVoice': 'male voice',
  'misc.terms': 'terms',
  'misc.strokeOrderHeading': 'Stroke order',
  'misc.strokeDataFrom': 'Stroke data from',
  'misc.byContributors': 'by Ulrich Apel and contributors, licensed under',
  'misc.fontsHeading': 'Fonts',
  'misc.japaneseFontsFrom': 'Japanese fonts from',
  'misc.fontsLicenseNote':
    ', used under the SIL Open Font License (Kosugi Maru: Apache 2.0). Interface text is set in Inter.',
  'misc.sfxHeading': 'Sound effects',
  'misc.sfxFrom': 'From',
  'misc.sfxDesc2':
    '(CC0), a few generated for kana, and three koto notes cut from a recording by Torsodog on Wikimedia Commons (CC BY 3.0).',
  'misc.photosHeading': 'Photos',
  'misc.allPhotosFrom': 'All photos from',
  'misc.photosLicense': ', used under the Unsplash License.',

  // NotFound.svelte
  'misc.notFoundTitle': '迷子 · Lost',
  'misc.notFoundText': "This page doesn't exist.",
  'misc.backHome': 'Back home',

  // Shortcuts.svelte
  'misc.shortcutsTitle': 'Keyboard shortcuts',
  'misc.shortcutReveal': 'Reveal the answer',
  'misc.shortcutGrade': 'Grade: Again, Hard, Good, Easy',
  'misc.shortcutAccept': 'Accept the suggested grade (typed answers)',
  'misc.shortcutPlay': 'Play the pronunciation',
  'misc.shortcutStrokes': 'Show the stroke order',
  'misc.shortcutFonts': 'Show the font gallery',
  'misc.shortcutNav': 'Previous / next card (in order)',
  'misc.shortcutMute': 'Mute or unmute sound effects',
  'misc.shortcutLeave': 'Leave the session',
  'misc.shortcutHelp': 'Show this list',

  // SoundToggle.svelte
  'misc.unmuteSfx': 'Unmute sound effects (M)',
  'misc.muteSfx': 'Mute sound effects (M)',
  'misc.volumeSettings': 'Volume settings',
  'misc.volume': 'Volume',
  'misc.soundSettings': 'Sound settings',
  'misc.soundEffects': 'Sound effects',
  'misc.effectsVolumeLabel': 'Effects volume',
  'misc.pronunciationVolumeLabel': 'Pronunciation volume',
  'misc.silentMode': 'Silent mode',
  'misc.mutesEverything': 'mutes everything',

  // Background.svelte
  'misc.previousPhoto': 'Previous photo',
  'misc.nextPhoto': 'Next photo',
  'misc.photoBy': 'Photo by',
  'misc.photoOn': 'on',

  // Toasts.svelte
  'misc.dismiss': 'Dismiss',

  // App.svelte – daily goal toast
  'misc.goalToast': 'Daily goal reached: {goal} answers. おみごと!',

  // main.ts – PWA toasts
  'misc.newVersionAvailable': 'A new version of kana is available',
  'misc.offlineReady': 'kana is ready to work offline',
  'misc.reload': 'Reload',
} as const
