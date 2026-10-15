/** Record a short clip from the microphone, to compare your pronunciation with the app's voice. */

export function recordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  )
}

/** A format the browser can record: Safari records MP4/AAC, Chrome and Firefox WebM/Opus. */
function mimeType(): string | undefined {
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) =>
    MediaRecorder.isTypeSupported(t),
  )
}

/**
 * Start recording. `stop()` resolves with the clip; recording also stops by itself after
 * `maxMs`, and `clip` resolves whenever it stops. The microphone is released as soon as
 * recording stops, which on iPhone also moves playback back from the earpiece to the speaker.
 */
export async function startRecording(
  maxMs = 5000,
): Promise<{ stop: () => Promise<Blob>; clip: Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const type = mimeType()
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      for (const track of stream.getTracks()) track.stop()
      resolve(new Blob(chunks, { type: recorder.mimeType || type || 'audio/webm' }))
    }
  })
  recorder.start()
  const timer = setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), maxMs)
  return {
    clip: done,
    stop: () => {
      clearTimeout(timer)
      if (recorder.state !== 'inactive') recorder.stop()
      return done
    },
  }
}
