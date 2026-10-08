/** A light vibration as answer feedback (Android; iOS Safari doesn't support vibration). */
export type HapticKind = 'tap' | 'double'

const PATTERNS: Record<HapticKind, number[]> = { tap: [12], double: [12, 60, 12] }

export function haptic(
  kind: HapticKind,
  options: { enabled: boolean; reducedMotion: boolean },
  nav: { vibrate?: (pattern: number[]) => boolean } | undefined = globalThis.navigator,
): boolean {
  if (!options.enabled || options.reducedMotion || typeof nav?.vibrate !== 'function') return false
  return nav.vibrate(PATTERNS[kind])
}
