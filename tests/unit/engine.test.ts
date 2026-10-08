import { describe, expect, test, vi } from 'vitest'
import {
  AudioEngine,
  MIYAKO_BUSHI,
  pickVariant,
  semitonesToRate,
  streakSemitones,
  type AudioSettings,
} from '../../src/lib/audio/engine'

describe('streak melody', () => {
  test('climbs the miyako-bushi scale from one octave up', () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => streakSemitones(n))).toEqual([12, 13, 17, 19, 20, 24])
  })
  test('is capped', () => {
    expect(streakSemitones(100)).toBe(streakSemitones(10))
    expect(streakSemitones(-1)).toBe(12)
  })
  test('scale has five notes', () => expect(MIYAKO_BUSHI).toHaveLength(5))
  test('semitonesToRate', () => {
    expect(semitonesToRate(0)).toBe(1)
    expect(semitonesToRate(12)).toBe(2)
    expect(semitonesToRate(-12)).toBe(0.5)
  })
})

describe('pickVariant', () => {
  test('avoids repeating the previous variant', () => {
    for (let i = 0; i < 20; i++) expect(pickVariant(['a', 'b'], 'a')).toBe('b')
  })
  test('works with a single variant', () => {
    expect(pickVariant(['a'], 'a')).toBe('a')
  })
})

/** Minimal fake of the Web Audio API that records what was played. */
function fakeAudio() {
  const played: { buffer: unknown; rate: number }[] = []
  const gains: { gain: { value: number } }[] = []
  class Param {
    value = 1
    setValueAtTime() {}
    linearRampToValueAtTime() {}
    cancelScheduledValues() {}
  }
  const node = () => ({ connect: (n: unknown) => n })
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(),
    createGain() {
      const g = { ...node(), gain: new Param() }
      gains.push(g)
      return g
    },
    createBufferSource() {
      const src = {
        ...node(),
        buffer: null as unknown,
        playbackRate: new Param(),
        onended: null as null | (() => void),
        start() {
          played.push({ buffer: src.buffer, rate: src.playbackRate.value })
          queueMicrotask(() => src.onended?.())
        },
        stop: vi.fn(),
      }
      return src
    },
    decodeAudioData: async (data: ArrayBuffer) => ({ duration: 0.4, data }),
  }
  return { ctx: ctx as unknown as AudioContext, played, gains }
}

const manifest = {
  events: { flip: ['flip-1.mp3', 'flip-2.mp3'], correct: ['correct-1.mp3'], tick: ['t.mp3'] },
}

function makeEngine() {
  const audio = fakeAudio()
  const requests: string[] = []
  const fetcher = (async (url: string) => {
    requests.push(url)
    if (url.endsWith('manifest.json')) return { ok: true, json: async () => manifest }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }
  }) as unknown as typeof fetch
  const engine = new AudioEngine(
    '/kana/',
    () => audio.ctx,
    fetcher,
    () => 0.5,
  )
  return { engine, audio, requests }
}

const settings: AudioSettings = {
  silent: false,
  sfx: true,
  sfxVolume: 0.5,
  voiceVolume: 1,
  uiTicks: false,
}

describe('AudioEngine', () => {
  test('plays a voice clip from the audio folder', async () => {
    const { engine, audio, requests } = makeEngine()
    engine.configure(settings)
    await engine.playVoice('shi')
    expect(requests).toContain('/kana/audio/shi.mp3')
    expect(audio.played).toHaveLength(1)
  })

  test('caches decoded buffers', async () => {
    const { engine, requests } = makeEngine()
    await engine.playVoice('a')
    await engine.playVoice('a')
    expect(requests.filter((r) => r.endsWith('a.mp3'))).toHaveLength(1)
  })

  test('plays sound effects with the requested pitch', async () => {
    const { engine, audio } = makeEngine()
    engine.configure(settings)
    await engine.playSfx('correct', { semitones: 12 })
    expect(audio.played.at(-1)?.rate).toBe(2)
  })

  test('adds a small random pitch variation by default', async () => {
    const { engine, audio } = makeEngine()
    engine.configure(settings)
    await engine.playSfx('flip')
    expect(audio.played.at(-1)?.rate).toBeCloseTo(1)
  })

  test('respects mute settings', async () => {
    const { engine, audio } = makeEngine()
    engine.configure({ ...settings, sfx: false })
    await engine.playSfx('flip')
    engine.configure({ ...settings, silent: true })
    await engine.playSfx('flip')
    await engine.playVoice('a')
    engine.configure({ ...settings, voiceVolume: 0 })
    await engine.playVoice('a')
    expect(audio.played).toHaveLength(0)
  })

  test('muting effects does not mute the voice', async () => {
    const { engine, audio } = makeEngine()
    engine.configure({ ...settings, sfx: false })
    await engine.playVoice('a')
    expect(audio.played).toHaveLength(1)
  })

  test('UI ticks only play when enabled', async () => {
    const { engine, audio } = makeEngine()
    engine.configure(settings)
    await engine.playSfx('tick')
    expect(audio.played).toHaveLength(0)
    engine.configure({ ...settings, uiTicks: true })
    await engine.playSfx('tick')
    expect(audio.played).toHaveLength(1)
  })

  test('previews play even when effects are off, but not in silent mode', async () => {
    const { engine, audio } = makeEngine()
    engine.configure({ ...settings, sfx: false })
    await engine.playSfx('tick', { preview: true })
    expect(audio.played).toHaveLength(1)
    engine.configure({ ...settings, silent: true })
    await engine.playSfx('tick', { preview: true })
    expect(audio.played).toHaveLength(1)
  })

  test('ignores events without files', async () => {
    const { engine, audio } = makeEngine()
    await engine.playSfx('milestone')
    expect(audio.played).toHaveLength(0)
  })

  test('applies volumes to the buses', () => {
    const { engine, audio } = makeEngine()
    engine.unlock()
    engine.configure({ ...settings, sfxVolume: 0.3, voiceVolume: 0.8 })
    const [master, voice, sfx] = audio.gains
    expect(master.gain.value).toBe(1)
    expect(voice.gain.value).toBe(0.8)
    expect(sfx.gain.value).toBe(0.3)
  })

  test('changing volumes cancels a pending ducking ramp', async () => {
    const { engine, audio } = makeEngine()
    engine.configure(settings)
    await engine.playVoice('a')
    const sfxBus = audio.gains[2]
    const cancel = vi.spyOn(
      sfxBus.gain as unknown as { cancelScheduledValues: () => void },
      'cancelScheduledValues',
    )
    engine.configure({ ...settings, sfxVolume: 0.2 })
    expect(cancel).toHaveBeenCalled()
    expect(sfxBus.gain.value).toBe(0.2)
  })

  test('is a no-op without Web Audio support', async () => {
    const engine = new AudioEngine('/', () => undefined)
    expect(engine.available).toBe(false)
    await expect(engine.playVoice('a')).resolves.toBeUndefined()
    await expect(engine.playSfx('flip')).resolves.toBeUndefined()
  })
})
