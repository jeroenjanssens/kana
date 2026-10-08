/** Transient UI state that is not persisted. */
export const ui = $state({
  /** Increment to advance the background photo. */
  photoTick: 0,
  /** When set, the background shows this photo index (e.g. "photo of the day"). */
  pinnedPhoto: undefined as number | undefined,
  toasts: [] as { id: number; text: string; action?: { label: string; run: () => void } }[],
  /** Whether a full-screen study session is active (hides navigation). */
  focus: false,
})

let toastId = 0

export function toast(text: string, action?: { label: string; run: () => void }, ms = 4000) {
  const id = ++toastId
  ui.toasts.push({ id, text, action })
  if (ms > 0) setTimeout(() => dismissToast(id), ms)
  return id
}

export function dismissToast(id: number) {
  ui.toasts = ui.toasts.filter((t) => t.id !== id)
}

export function nextPhoto() {
  ui.pinnedPhoto = undefined
  ui.photoTick++
}
