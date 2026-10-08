/**
 * Small Web Audio engine with a master bus and two sub-buses: `voice` for pronunciation and
 * `sfx` for sound effects. Sound effects are ducked while a pronunciation clip plays.
 */

export type SfxEvent =
  'flip' | 'correct' | 'wrong' | 'stamp' | 'bell' | 'complete' | 'milestone' | 'tick'

export interface SfxManifest {
  events: Partial<Record<SfxEvent, string[]>>
  rootHz?: Record<string, number>
}

export interface AudioSettings {
  silent: boolean
  sfx: boolean
  sfxVolume: number
  voiceVolume: number
  uiTicks: boolean
}

/** Miyako-bushi scale (semitones above the root): the classic koto tuning. */
export const MIYAKO_BUSHI = [0, 1, 5, 7, 8]

/** Semitone offset for the n-th note of a correct-answer streak, climbing the scale. */
export function streakSemitones(step: number, startOctave = 1, maxSteps = 10): number {
  const n = Math.min(Math.max(0, step), maxSteps)
  const octave = Math.floor(n / MIYAKO_BUSHI.length)
  return (startOctave + octave) * 12 + MIYAKO_BUSHI[n % MIYAKO_BUSHI.length]
}

export function semitonesToRate(semitones: number): number {
  return 2 ** (semitones / 12)
}

export function pickVariant<T>(items: readonly T[], previous?: T, rand = Math.random): T {
  const pool = items.length > 1 ? items.filter((i) => i !== previous) : items
  return pool[Math.floor(rand() * pool.length)]
}

const DUCK_GAIN = 0.35

type ContextFactory = () => AudioContext | undefined

function defaultContext(): AudioContext | undefined {
  const Ctor =
    globalThis.AudioContext ??
    (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return Ctor ? new Ctor() : undefined
}

export class AudioEngine {
  private ctx?: AudioContext
  private master?: GainNode
  private voiceBus?: GainNode
  private sfxBus?: GainNode
  private buffers = new Map<string, Promise<AudioBuffer | undefined>>()
  private lastVariant = new Map<SfxEvent, string>()
  private currentVoice?: AudioBufferSourceNode
  private manifest?: SfxManifest
  private settings: AudioSettings = {
    silent: false,
    sfx: true,
    sfxVolume: 0.5,
    voiceVolume: 1,
    uiTicks: false,
  }

  constructor(
    private readonly base: string,
    private readonly createContext: ContextFactory = defaultContext,
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
    private readonly rand: () => number = Math.random,
  ) {}

  get available(): boolean {
    return this.ensure() !== undefined
  }

  /** Create (or resume) the audio context. Call from a user gesture to satisfy autoplay rules. */
  unlock(): void {
    const ctx = this.ensure()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  configure(settings: AudioSettings): void {
    this.settings = { ...settings }
    this.applyGains()
  }

  async loadManifest(): Promise<SfxManifest | undefined> {
    if (this.manifest) return this.manifest
    try {
      const res = await this.fetcher(`${this.base}sfx/manifest.json`)
      this.manifest = (await res.json()) as SfxManifest
    } catch {
      this.manifest = { events: {} }
    }
    return this.manifest
  }

  /** Decode and cache a file. Resolves to undefined if audio is unavailable or loading fails. */
  load(path: string): Promise<AudioBuffer | undefined> {
    const cached = this.buffers.get(path)
    if (cached) return cached
    const promise = (async () => {
      const ctx = this.ensure()
      if (!ctx) return undefined
      try {
        const res = await this.fetcher(`${this.base}${path}`)
        if (!res.ok) return undefined
        return await ctx.decodeAudioData(await res.arrayBuffer())
      } catch {
        return undefined
      }
    })()
    this.buffers.set(path, promise)
    return promise
  }

  /** Preload all sound effects so they play without latency. */
  async preloadSfx(): Promise<void> {
    const manifest = await this.loadManifest()
    const files = Object.values(manifest?.events ?? {}).flat()
    await Promise.all(files.map((f) => this.load(`sfx/${f}`)))
  }

  /** Play the pronunciation of a kana. Resolves when playback ends. */
  async playVoice(kanaId: string): Promise<void> {
    if (this.settings.silent || this.settings.voiceVolume <= 0) return
    this.unlock()
    const buffer = await this.load(`audio/${kanaId}.mp3`)
    const ctx = this.ctx
    if (!buffer || !ctx || !this.voiceBus) return
    this.currentVoice?.stop()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.voiceBus)
    this.currentVoice = source
    this.duck(buffer.duration)
    source.start()
    await new Promise<void>((resolve) => {
      source.onended = () => resolve()
    })
  }

  /**
   * Play a sound effect. `semitones` shifts the pitch (used for the koto streak melody);
   * otherwise a small random variation keeps repeated effects from sounding mechanical.
   */
  async playSfx(event: SfxEvent, options: { semitones?: number; gain?: number } = {}) {
    if (this.settings.silent || !this.settings.sfx || this.settings.sfxVolume <= 0) return
    if (event === 'tick' && !this.settings.uiTicks) return
    const manifest = await this.loadManifest()
    const files = manifest?.events[event]
    if (!files?.length) return
    const file = pickVariant(files, this.lastVariant.get(event), this.rand)
    this.lastVariant.set(event, file)
    const buffer = await this.load(`sfx/${file}`)
    const ctx = this.ctx
    if (!buffer || !ctx || !this.sfxBus) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value =
      options.semitones !== undefined
        ? semitonesToRate(options.semitones)
        : 1 + (this.rand() - 0.5) * 0.06
    const gain = ctx.createGain()
    gain.gain.value = (options.gain ?? 1) * (0.9 + this.rand() * 0.1)
    source.connect(gain).connect(this.sfxBus)
    source.start()
  }

  private ensure(): AudioContext | undefined {
    if (this.ctx) return this.ctx
    const ctx = this.createContext()
    if (!ctx) return undefined
    this.ctx = ctx
    this.master = ctx.createGain()
    this.voiceBus = ctx.createGain()
    this.sfxBus = ctx.createGain()
    this.voiceBus.connect(this.master)
    this.sfxBus.connect(this.master)
    this.master.connect(ctx.destination)
    this.applyGains()
    return ctx
  }

  private applyGains(): void {
    if (!this.master || !this.voiceBus || !this.sfxBus) return
    const s = this.settings
    this.master.gain.value = s.silent ? 0 : 1
    this.voiceBus.gain.value = s.voiceVolume
    this.sfxBus.gain.value = s.sfx ? s.sfxVolume : 0
  }

  private duck(seconds: number): void {
    const ctx = this.ctx
    const bus = this.sfxBus
    if (!ctx || !bus || !this.settings.sfx) return
    const level = this.settings.sfxVolume
    const t = ctx.currentTime
    bus.gain.cancelScheduledValues(t)
    bus.gain.setValueAtTime(level * DUCK_GAIN, t)
    bus.gain.setValueAtTime(level * DUCK_GAIN, t + seconds)
    bus.gain.linearRampToValueAtTime(level, t + seconds + 0.25)
  }
}
