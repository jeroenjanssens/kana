<script lang="ts">
  import '../lib/i18n/speech'
  import { onDestroy } from 'svelte'
  import Icon from '../components/Icon.svelte'
  import RecordCompare from '../components/RecordCompare.svelte'
  import SayButton from '../components/SayButton.svelte'
  import { SOUND_CLASSES, soundOf } from '../lib/speech/classes'
  import { judge } from '../lib/speech/judge'
  import type { KanaResult } from '../lib/speech/recognize'
  import { recordingSupported } from '../lib/audio/recorder'
  import {
    SpeechError,
    heardKana,
    listen,
    normalizeHeard,
    speechRecognitionSupported,
    type Heard,
    type SpeechErrorCode,
  } from '../lib/audio/speech'
  import { KANA, kanaById } from '../lib/data/kana'
  import { words } from '../lib/data/words'
  import type { MessageKey } from '../lib/i18n/messages'
  import { shuffle } from '../lib/ui/random'
  import { audio } from '../state/app.svelte'
  import { t } from '../state/i18n.svelte'

  /**
   * A test bench for speaking: say a kana or word and see exactly what the browser's speech
   * recognition heard, to find out how well it works on this device before building on it.
   */
  interface Target {
    text: string
    romaji: string
    play: () => Promise<void>
    /** The kana's sound class, for the offline model (single kana only). */
    sound?: string
  }

  const canListen = speechRecognitionSupported()
  const canRecord = recordingSupported()

  /** Kana that are easy to confuse or hard to recognise on their own, plus a few plain ones. */
  const KANA_IDS = ['a', 'ka', 'su', 'tsu', 'shi', 'chi', 'fu', 'n', 'wo', 'ra', 'kyo', 'ga']
  const kanaTargets: Target[] = KANA_IDS.map(kanaById).map((k) => ({
    text: k.hiragana,
    romaji: k.romaji,
    play: () => audio.playVoice(k.id),
    sound: soundOf(k),
  }))

  function someWords(): Target[] {
    return shuffle(words.slice(0, 120))
      .slice(0, 8)
      .map((w) => ({ text: w.kana, romaji: w.romaji, play: () => audio.playWord(w.index) }))
  }

  let wordTargets = $state(someWords())
  let target = $state<Target>(kanaTargets[0])
  let listening = $state(false)
  let live = $state<Heard[]>([])
  let stop: (() => void) | undefined
  let attempts = $state<{ target: string; heard: Heard[]; match: boolean; offline?: boolean }[]>([])
  let error = $state<SpeechErrorCode | undefined>()

  onDestroy(() => stop?.())

  const ERROR_KEY: Record<SpeechErrorCode, MessageKey> = {
    'not-allowed': 'speech.error.notAllowed',
    'service-not-allowed': 'speech.error.serviceNotAllowed',
    network: 'speech.error.network',
    'no-speech': 'speech.error.noSpeech',
    'audio-capture': 'speech.error.audioCapture',
    'language-not-supported': 'speech.error.language',
    aborted: 'speech.error.other',
    other: 'speech.error.other',
  }

  async function say() {
    if (listening) return stop?.()
    error = undefined
    live = []
    listening = true
    const said = target.text
    const session = listen((heard) => (live = heard))
    stop = session.stop
    try {
      const heard = await session.result
      attempts = [{ target: said, heard, match: heardKana(heard, said) }, ...attempts]
    } catch (err) {
      error = err instanceof SpeechError ? err.code : 'other'
    } finally {
      listening = false
      live = []
      stop = undefined
    }
  }

  /** The offline model's guesses, shown like the browser's: written kana and probability. */
  function heardOffline(result: KanaResult) {
    const sound = target.sound
    if (!sound) return
    const v = judge(result, sound)
    const heard = v.nothing
      ? []
      : v.heard.map((g) => ({
          transcript: kanaById(SOUND_CLASSES.find((c) => c.id === g.sound)!.kana[0]).hiragana,
          confidence: g.p,
        }))
    attempts = [{ target: target.text, heard, match: v.correct, offline: true }, ...attempts]
  }

  function pick(next: Target) {
    target = next
    void next.play()
  }

  const known = new Set(KANA.flatMap((k) => [k.hiragana, k.katakana]))
  /** Show the hiragana reading when it differs from what was heard (e.g. for katakana). */
  function reading(transcript: string): string | undefined {
    const n = normalizeHeard(transcript)
    return n !== transcript && [...n].every((c) => known.has(c) || c === 'ー') ? n : undefined
  }
</script>

<header class="page-head">
  <p class="eyebrow light">{t('speech.eyebrow')}</p>
  <h1>{t('speech.heading')}</h1>
  <p class="lead">{t('speech.lead')}</p>
</header>

<div class="layout">
  <section class="panel status">
    <h2>{t('speech.statusHeading')}</h2>
    <ul>
      <li class:ok={canListen}>
        <Icon name={canListen ? 'check' : 'close'} size={16} />
        {canListen ? t('speech.recognitionYes') : t('speech.recognitionNo')}
      </li>
      <li class:ok={canRecord}>
        <Icon name={canRecord ? 'check' : 'close'} size={16} />
        {canRecord ? t('speech.recordingYes') : t('speech.recordingNo')}
      </li>
    </ul>
    <p class="muted small">{t('speech.privacy')}</p>
  </section>

  <section class="panel try">
    <h2>{t('speech.tryHeading')}</h2>
    <div class="targets" role="group" aria-label={t('speech.kanaLabel')}>
      {#each kanaTargets as k (k.text)}
        <button
          class="target"
          lang="ja"
          aria-pressed={target.text === k.text}
          onclick={() => pick(k)}>{k.text}</button
        >
      {/each}
    </div>
    <div class="targets" role="group" aria-label={t('speech.wordsLabel')}>
      {#each wordTargets as w (w.text)}
        <button
          class="target word"
          lang="ja"
          aria-pressed={target.text === w.text}
          onclick={() => pick(w)}>{w.text}</button
        >
      {/each}
      <button
        class="btn small ghost"
        onclick={() => (wordTargets = someWords())}
        aria-label={t('speech.otherWords')}><Icon name="shuffle" size={14} /></button
      >
    </div>

    <div class="current">
      <span class="big" lang="ja">{target.text}</span>
      <span class="muted">{target.romaji}</span>
      <button class="btn small" onclick={() => target.play()}>
        <Icon name="play" size={14} filled />
        {t('common.listen')}
      </button>
    </div>

    {#if canListen}
      <button class="btn primary say" class:listening onclick={say}>
        <Icon name={listening ? 'stop' : 'mic'} size={18} />
        {listening ? t('speech.listening') : t('speech.say', { text: target.text })}
      </button>
      {#if live.length}
        <p class="live" lang="ja" aria-live="polite">{live[0].transcript}</p>
      {/if}
      {#if error}<p class="error" role="alert">{t(ERROR_KEY[error])}</p>{/if}
    {/if}

    <div class="offline">
      <h3>{t('speech.offlineHeading')}</h3>
      <p class="muted small">{t('speech.offlineDesc')}</p>
      {#if target.sound}
        {#key target.text}
          <SayButton
            label={t('speech.offlineSay', { text: target.text })}
            onresult={heardOffline}
          />
        {/key}
      {:else}
        <p class="muted small">{t('speech.offlineKanaOnly')}</p>
      {/if}
    </div>

    {#key target.text}
      <div class="record">
        <span class="muted small">{t('speech.recordHint')}</span>
        <RecordCompare reference={target.play} />
      </div>
    {/key}
  </section>

  {#if attempts.length}
    <section class="panel results">
      <h2>{t('speech.resultsHeading')}</h2>
      <ol>
        {#each attempts as a, i (attempts.length - i)}
          <li>
            <span class="said" lang="ja">{a.target}</span>
            <span class="source"
              >{a.offline ? t('speech.sourceOffline') : t('speech.sourceBrowser')}</span
            >
            <span class="verdict" class:match={a.match}
              >{a.match ? t('speech.match') : t('speech.noMatch')}</span
            >
            {#if a.heard.length}
              <ul class="heard">
                {#each a.heard as h, j (j)}
                  {@const r = reading(h.transcript)}
                  <li lang="ja">
                    「{h.transcript}」{#if r}<span class="muted"> → {r}</span>{/if}
                    {#if h.confidence > 0}<span class="muted conf"
                        >{Math.round(h.confidence * 100)}%</span
                      >{/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="muted small">{t('speech.nothingHeard')}</p>
            {/if}
          </li>
        {/each}
      </ol>
    </section>
  {/if}
</div>

<style>
  .page-head {
    color: #fff;
    text-shadow: 0 2px 14px rgb(0 0 0 / 0.45);
    margin-bottom: 1rem;
  }

  .eyebrow.light {
    color: rgb(255 255 255 / 0.85);
  }

  .lead {
    max-width: 62ch;
  }

  .layout {
    display: grid;
    gap: 1rem;
    max-width: 720px;
  }

  .panel {
    padding: 1.25rem 1.5rem;
  }

  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.15rem;
  }

  .status ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.35rem;
  }

  .status li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--shu);
  }

  .status li.ok {
    color: var(--level-mature);
  }

  .small {
    font-size: 0.85rem;
  }

  .status p {
    margin: 0.75rem 0 0;
  }

  .targets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.6rem;
  }

  .target {
    min-width: 2.6rem;
    padding: 0.3rem 0.55rem;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: color-mix(in srgb, var(--paper) 50%, transparent);
    color: var(--ink);
    font-family: var(--font-kana);
    font-size: 1.3rem;
    cursor: pointer;
  }

  .target.word {
    font-size: 1.05rem;
  }

  .target[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }

  .current {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin: 0.75rem 0 1rem;
  }

  .big {
    font-family: var(--font-kana);
    font-size: 3rem;
    line-height: 1.1;
  }

  .say {
    min-height: 52px;
    padding-inline: 1.4rem;
    font-size: 1.05rem;
  }

  .say.listening {
    background: var(--shu);
    border-color: var(--shu);
  }

  .live {
    margin: 0.6rem 0 0;
    font-size: 1.3rem;
  }

  .error {
    margin: 0.6rem 0 0;
    color: var(--shu);
  }

  .record {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }

  .results ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.75rem;
  }

  .said {
    font-family: var(--font-kana);
    font-size: 1.4rem;
    margin-right: 0.5rem;
  }

  .offline {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .offline h3 {
    margin: 0;
    font-size: 1rem;
  }

  .offline p {
    margin: 0;
  }

  .source {
    margin-right: 0.5rem;
    padding: 0.05rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }

  .verdict {
    font-weight: 650;
    color: var(--shu);
  }

  .verdict.match {
    color: var(--level-mature);
  }

  .heard {
    margin: 0.25rem 0 0;
    padding-left: 1.1rem;
  }

  .conf {
    margin-left: 0.4rem;
    font-size: 0.8rem;
  }
</style>
