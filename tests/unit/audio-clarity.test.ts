// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'

function hasFfmpeg(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** Milliseconds of hiss (many zero crossings) and of voiced vowel (few), ignoring near-silence. */
function hissAndVowel(file: string): { hiss: number; vowel: number } {
  const buf = execFileSync('ffmpeg', [
    '-v',
    'error',
    '-i',
    file,
    '-ac',
    '1',
    '-ar',
    '22050',
    '-f',
    'f32le',
    '-',
  ])
  const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)
  const hop = 220 // 10 ms
  let hiss = 0
  let vowel = 0
  for (let i = 0; i + hop <= x.length; i += hop) {
    let energy = 0
    let crossings = 0
    for (let j = i; j < i + hop; j++) {
      energy += x[j] * x[j]
      if (j > i && x[j] > 0 !== x[j - 1] > 0) crossings++
    }
    if (10 * Math.log10(energy / hop + 1e-12) < -35) continue
    if (crossings > 40) hiss += 10
    else vowel += 10
  }
  return { hiss, vowel }
}

describe.skipIf(!hasFfmpeg())('pronunciation clarity', () => {
  // Japanese whispers u/i after voiceless consonants; on its own す can sound like a bare "s".
  // The generator holds these vowels long enough that they clearly outlast the consonant.
  test.each(['female/su', 'male/su', 'female/tsu', 'male/tsu'])(
    'the vowel in %s is clearly audible',
    (id) => {
      const { hiss, vowel } = hissAndVowel(`public/audio/${id}.mp3`)
      expect(vowel - hiss, `hiss ${hiss} ms, vowel ${vowel} ms`).toBeGreaterThanOrEqual(20)
    },
  )
})
