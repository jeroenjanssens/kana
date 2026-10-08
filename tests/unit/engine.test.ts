import { describe, expect, test, vi } from 'vitest'
import {
  AudioEngine,
  gradeSound,
  pickVariant,
  semitonesToRate,
  type AudioSettings,
} from '../../src/lib/audio/engine'

describe('grade sounds', () => {
  test('Again is the wooden tock; Hard, Good and Easy are three koto notes', () => {
    expect(([1, 2, 3, 4] as const).map((g) => gradeSound(g))).toEqual([
      'wrong',
      'hard',
      'good',
      'easy',
    ])
  })
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
  events: {
    flip: ['flip-1.mp3', 'flip-2.mp3'],
    hard: ['koto-hard.mp3'],
    good: ['koto-good.mp3'],
    easy: ['koto-easy.mp3'],
    wrong: ['wrong-1.mp3'],
    tick: ['t.mp3'],
  },
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
  voice: 'female',
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
    expect(requests).toContain('/kana/audio/female/shi.mp3')
    expect(audio.played).toHaveLength(1)
  })

  test('uses the configured voice, or the one passed for a card', async () => {
    const { engine, requests } = makeEngine()
    engine.configure({ ...settings, voice: 'male' })
    await engine.playVoice('ka')
    await engine.playVoice('ka', 'female')
    await engine.playWord(7)
    expect(requests).toEqual(
      expect.arrayContaining([
        '/kana/audio/male/ka.mp3',
        '/kana/audio/female/ka.mp3',
        '/kana/audio/male/words/007.mp3',
      ]),
    )
  })

  test('the random voice setting picks a voice per call', () => {
    const { engine } = makeEngine()
    engine.configure({ ...settings, voice: 'random' })
    expect(['female', 'male']).toContain(engine.pickVoice())
    engine.configure({ ...settings, voice: 'male' })
    expect(engine.pickVoice()).toBe('male')
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
    await engine.playSfx('good', { semitones: 12 })
    expect(audio.played.at(-1)?.rate).toBe(2)
  })

  test('each grade plays its own note, always at the recorded pitch', async () => {
    const { engine, audio, requests } = makeEngine()
    engine.configure(settings)
    for (const g of [2, 3, 4, 3] as const) await engine.playGrade(g)
    expect(audio.played.map((p) => p.rate)).toEqual([1, 1, 1, 1])
    expect(requests.filter((r) => r.includes('koto')).map((r) => r.split('/').pop())).toEqual([
      'koto-hard.mp3',
      'koto-good.mp3',
      'koto-easy.mp3',
    ])
  })

  test('Again plays the wooden tock', async () => {
    const { engine, audio, requests } = makeEngine()
    engine.configure(settings)
    await engine.playGrade(1)
    expect(audio.played).toHaveLength(1)
    expect(requests.at(-1)).toMatch(/sfx\/wrong-1\.mp3$/)
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
