import { describe, expect, test } from 'vitest'
import { KANA } from '../../src/lib/data/kana'
import { strokesFor } from '../../src/lib/data/strokes'
import { prng } from '../../src/lib/ui/random'
import {
  checkWriting,
  describeResult,
  length,
  normalize,
  referenceStrokes,
  resample,
  samplePath,
  writingGrade,
  type Point,
} from '../../src/lib/study/handwriting'

const ref = (text: string) => referenceStrokes(strokesFor(text))

/** Turn reference strokes into a plausible "drawing": sparser points with a little jitter. */
function draw(strokes: Point[][], jitter = 1.2, seed = 1): Point[][] {
  const rand = prng(seed)
  return strokes.map((s) =>
    resample(s, 12).map(([x, y]) => [
      x + (rand() - 0.5) * jitter * 2,
      y + (rand() - 0.5) * jitter * 2,
    ]),
  )
}

describe('samplePath', () => {
  test('starts at the move-to and ends at the last curve point', () => {
    const pts = samplePath('M10,20c0,0,10,0,10,10', 4)
    expect(pts[0]).toEqual([10, 20])
    expect(pts.at(-1)).toEqual([20, 30])
    expect(pts).toHaveLength(5)
  })

  test('relative and absolute curves give the same result', () => {
    const rel = samplePath('M10,10c5,0,10,5,10,10', 8)
    const abs = samplePath('M10,10C15,10,20,15,20,20', 8)
    rel.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(abs[i][0])
      expect(p[1]).toBeCloseTo(abs[i][1])
    })
  })

  test('handles lines, smooth curves and close-path', () => {
    expect(samplePath('M0,0L10,0l0,10z').at(-1)).toEqual([0, 0])
    const s = samplePath('M0,0c0,10,10,10,10,0s10,-10,10,0', 4)
    expect(s.at(-1)![0]).toBeCloseTo(20)
  })

  test('parses numbers without separators like KanjiVG writes them', () => {
    const pts = samplePath('M31.01,33c0.88,0.88,2.75,1.82,5.25,1.75c8.62-0.25,20-2.12,29.5-4.25')
    expect(pts[0]).toEqual([31.01, 33])
    expect(pts.at(-1)![0]).toBeCloseTo(31.01 + 5.25 + 29.5)
    expect(pts.at(-1)![1]).toBeCloseTo(33 + 1.75 - 4.25)
  })
})

describe('resample and normalize', () => {
  test('resample spreads points evenly', () => {
    const r = resample(
      [
        [0, 0],
        [10, 0],
      ],
      11,
    )
    expect(r).toHaveLength(11)
    expect(r[5][0]).toBeCloseTo(5)
    expect(length(r)).toBeCloseTo(10)
  })

  test('normalize centres the drawing and scales its largest side to 1', () => {
    const n = normalize([
      [
        [10, 10],
        [30, 20],
      ],
    ])
    expect(n[0][0]).toEqual([0, 0.25])
    expect(n[0][1]).toEqual([1, 0.75])
  })
})

describe('checkWriting', () => {
  const writable = KANA.filter((k) => k.group !== 'extended')

  test('every kana drawn along its own strokes is accepted', () => {
    for (const k of writable) {
      for (const text of [k.hiragana, k.katakana]) {
        const r = ref(text)
        expect(checkWriting(draw(r, 1, k.order + 1), r).correct, text).toBe(true)
      }
    }
  })

  test('drawings at another size and position are accepted', () => {
    const r = ref('あ')
    const moved = r.map((s) => s.map(([x, y]) => [x * 2.5 + 40, y * 2.5 + 10] as Point))
    expect(checkWriting(moved, r).correct).toBe(true)
  })

  test('a reversed stroke is caught', () => {
    const r = ref('ア')
    const drawn = draw(r)
    drawn[1] = [...drawn[1]].reverse()
    const result = checkWriting(drawn, r)
    expect(result.correct).toBe(false)
    expect(result.strokes[1].issue).toBe('direction')
    expect(describeResult(result)).toBe('Stroke 2 goes the other way.')
  })

  test('swapped strokes are caught', () => {
    const r = ref('い')
    const drawn = draw(r)
    const result = checkWriting([drawn[1], drawn[0]], r)
    expect(result.correct).toBe(false)
    expect(result.strokes.some((s) => s.issue === 'order' || s.issue === 'shape')).toBe(true)
  })

  test('missing and extra strokes are caught', () => {
    const r = ref('あ')
    const drawn = draw(r)
    expect(checkWriting(drawn.slice(0, 2), r)).toMatchObject({
      correct: false,
      countIssue: 'missing',
    })
    expect(describeResult(checkWriting(drawn.slice(0, 2), r))).toBe(
      'This kana has 3 strokes; you drew 2.',
    )
    expect(checkWriting([...drawn, drawn[0]], r)).toMatchObject({
      correct: false,
      countIssue: 'extra',
    })
  })

  test('a look-alike kana is not accepted', () => {
    for (const [wrong, right] of [
      ['シ', 'ツ'],
      ['ツ', 'シ'],
      ['ソ', 'ン'],
      ['ぬ', 'め'],
      ['る', 'ろ'],
    ]) {
      const drawn = draw(ref(wrong))
      const target = ref(right)
      if (drawn.length !== target.length) continue
      expect(checkWriting(drawn, target).correct, `${wrong} for ${right}`).toBe(false)
    }
  })

  test('random scribbles with the right number of strokes are rejected', () => {
    const rand = prng(99)
    let accepted = 0
    const sample = writable.slice(0, 60)
    for (const k of sample) {
      const r = ref(k.hiragana || k.katakana)
      const scribble = r.map(() =>
        Array.from({ length: 8 }, () => [rand() * 109, rand() * 109] as Point),
      )
      if (checkWriting(scribble, r).correct) accepted++
    }
    expect(accepted).toBe(0)
  })

  test('a drawing with a sloppy but recognisable shape is still accepted', () => {
    const r = ref('ね')
    expect(checkWriting(draw(r, 4, 7), r).correct).toBe(true)
  })

  test('empty strokes are ignored', () => {
    const r = ref('し')
    expect(checkWriting([[], ...draw(r)], r).correct).toBe(true)
  })
})

describe('writingGrade', () => {
  const r = ref('か')
  const good = checkWriting(draw(r, 0.5), r)
  test('wrong is Again', () => {
    expect(writingGrade(checkWriting(draw(r).slice(1), r), 1000)).toBe(1)
  })
  test('quick and accurate is Easy, slower is Good, very slow is Hard', () => {
    expect(writingGrade(good, 5000)).toBe(4)
    expect(writingGrade(good, 12_000)).toBe(3)
    expect(writingGrade(good, 30_000)).toBe(2)
  })
})
