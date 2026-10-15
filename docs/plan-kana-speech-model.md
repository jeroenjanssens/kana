# Plan: an offline speech model for saying kana out loud

Recognise which kana you said with a small model of our own that runs in the browser, so speaking
practice works offline, privately, in every browser (including Vivaldi), and for single kana —
where general speech recognition (Safari, Chrome, Whisper) is at its weakest.

Status: **built** (phases 0–5), **model v1 is a NO-GO**: 52% right on new voices (clean), 45%
with noise, far below the 90% bar. Shipped as an experiment to try on real voices. See "How it
turned out" at the end.

## Decisions

- **Download on first use**: the model isn't part of the app's offline bundle until speaking is
  first used; from then on it's cached and works offline.
- **VOICEVOX only, for now**: training *and* testing use VOICEVOX voices; the test score comes from
  voices held out of training entirely. Recording real voices (Phase 0's test set) and Common
  Voice come later, when the model is worth testing on people.
- **Extended kana later**: the first model covers basic, dakuten and yōon kana: 104 kana, **101
  sounds**. ファ, ティ and the other 19 extended kana are added in a later version.

## What it will do

You see a kana (or hear it), say it, and within a fraction of a second the app says what it
heard:

- **す ✓ 94%**: recognised, with a score for how clearly it sounded like す;
- **Sounded like つ**: the model's best guess when it isn't the target, with the runner-up sounds,
  so you learn *which* sound you're making;
- your recording and the app's voice can be compared, as now.

Everything happens on the device: no audio leaves it, it works in flight mode, and the model is
downloaded once (well under 1 MB) only when you first use speaking.

## Why our own model

| | Browser speech (Safari/Chrome) | Whisper in the browser | Own kana model |
| --- | --- | --- | --- |
| Offline / private | No (Safari: maybe on iPhone) | Yes | Yes |
| Vivaldi, Brave | No | Yes | Yes |
| Download | 0 | 40–250 MB | < 1 MB |
| Single kana | Poor: kanji (酢), nothing, guesses | Poor: hallucinates on short clips | What it's built for |
| Says *what* you said instead | Sometimes | Sometimes | Always (ranked sounds) |
| Pronunciation score | No | No | Yes (probability of the target) |
| Words and sentences | Good | Good | No (kana only, see later phases) |

The trade-off: it only knows the kana sounds, and it's trained on synthetic voices, so how
well it handles real human voices is the big unknown. The plan tests that early, before building
on it.

## How it works

```
 Training (on the Mac, once)                       In the app (in the browser)
 ───────────────────────────                       ───────────────────────────
 VOICEVOX: 101 sounds × ~100 voices                 microphone → 16 kHz audio
   × speed/pitch/intonation variations                 → voice activity detection (start/end)
 + noise, room echo, phone-mic and codec effects       → 1 s window around the sound
   → log-mel spectrograms                              → log-mel spectrogram (same maths)
   → small CNN (PyTorch)                               → small CNN (plain TypeScript, in a worker)
   → weights file (public/models/…)  ───────────────►  → 101 sound probabilities → result
```

### Sound classes

The 104 basic, dakuten and yōon kana make **101 distinct sounds**: お/を, じ/ぢ and ず/づ sound
the same and share a class (with the extended kana later: 123 kana, 120 sounds). Plus one extra
class, **"no kana"** (silence, noise, coughs, other speech), so the model can say
"I didn't catch that" instead of forcing a guess. The classes are generated from `KANA` in
`src/lib/data/kana.ts` into `ml/classes.json` (`just ml-classes`), so the app and the training code
can't drift apart.

Extended kana (ファ, ティ…, 19 in all) come in a later model version, once the first one works.

## Phase 0 — Licences (go/no-go), and later a real-voice test set

**Licences.** VOICEVOX's terms allow commercial and non-commercial use and defer to each voice
library's own terms; the Tohoku Zunko project's terms (ずんだもん, 四国めたん, 九州そら, 東北
ずん子/きりたん/イタコ, 中国うさぎ, 中部つるぎ, あんこもん) don't mention machine learning either
way. For all 43 characters (127 styles) we:

1. read each character's terms and record them in `ml/VOICES.md`: allowed / not mentioned /
   forbidden, with a link and the relevant clause;
2. train only on voices that aren't forbidden, and drop "not mentioned" ones if any terms
   prohibit uses like ours in spirit (e.g. "no use in AI voice products");
3. where it's unclear, ask the rights holder (most have a contact form);
4. credit every voice used in NOTICE and on the Credits page, as now for the two app voices.

Note that the app never ships the generated audio, only model weights learned from it.

**A real-voice test set (later).** For now the model is tested on held-out VOICEVOX voices. That
says how well it handles *new* voices, but not real people through a phone microphone; when the
model is good enough to try on people, this test set follows. A hidden page, `#/speech/collect`, shows each sound in turn (with the
app's voice to copy) and records it 3 times: about 300 clips, 15 minutes. Clips are kept in the
browser (IndexedDB) and exported as a zip of 16 kHz WAV files named `{class}-{n}.wav`. You record
one set; recordings by native speakers (friends, a teacher) would be even better, as would a
second learner. These clips are **never trained on**: they're only for testing.

## Phase 1 — Training data

A Python project in `ml/`, managed with **uv** (`ml/pyproject.toml`: torch, torchaudio, numpy,
soundfile). Everything it downloads or generates lives in `ml/data/` (git-ignored).

**Synthetic speech** (`ml/kana_speech/generate.py`, `just ml-data`): for every allowed voice
style and every sound, synthesise the kana with VOICEVOX (the same kana notation as the app's
audio), in several prosody variants: speed 0.85–1.25, pitch −0.1…+0.1, intonation 0.8–1.3,
volume. The app's current style (longer s, faded-in hiss, held weak vowels) is one of the
variants, not the only one, so the model learns natural speech too.

Rough size: 101 sounds × ~100 voice styles × 6 variants ≈ 60,000 clips (≈ 1.3 GB as FLAC).
Generation is cached and resumable; at ~0.15 s per clip on the M4 that's 2.5 hours, run once
(several requests in parallel can cut that).

**"No kana" examples:** silence, room noise, breathing, clicks, and snippets of VOICEVOX words
and sentences that don't line up with a single kana.

**Augmentation**, applied randomly during training so every epoch is different:

- background noise at 5–30 dB SNR (MUSAN noise, CC BY 4.0, and synthetic noise);
- room echo (OpenSLR SLR28 impulse responses, Apache 2.0);
- phone microphones: band-pass 100–7000 Hz, random EQ, gain, clipping;
- codecs, since browsers record AAC (Safari) or Opus (Chrome): a share of clips round-tripped
  through ffmpeg;
- timing: random offset in the 1 s window, small time stretch;
- SpecAugment: masking random frequency bands and time steps.

**Splits by voice, not by clip:** some characters are held out entirely for validation and
testing, so the score measures new voices, not memorised ones.

## Phase 2 — The model

**Features** (identical in Python and TypeScript): 16 kHz mono; 25 ms frames every 10 ms (400
samples, hop 160, 512-point FFT, Hann window); 40 mel bands from 60 to 7,600 Hz; log; then
mean/variance normalisation per utterance, which evens out microphones and loudness. A 1 s window
gives a 98 × 40 spectrogram.

**Network:** a small depthwise-separable CNN (the "DS-CNN" design used for keyword spotting):
a regular 3×3 convolution, then 4–6 depthwise + pointwise blocks with batch norm and ReLU,
global average pooling, and a 102-way linear layer (101 sounds + "no kana"). Roughly 100,000–300,000 parameters: about
0.1–0.3 MB with 8-bit weights, ~5–20 million multiply-adds per guess (a few milliseconds in plain
JavaScript). Batch norm is folded into the convolutions on export.

**Training** (`just ml-train`): PyTorch on the M4's GPU (MPS), cross-entropy with label smoothing,
AdamW, cosine learning rate, ~30–60 epochs. Then **temperature scaling** on the validation voices,
so "94%" means something.

**Evaluation** (`just ml-eval`) writes `ml/reports/{version}.md`:

- top-1 and top-3 accuracy on the held-out VOICEVOX voices (and, later, the real-voice test set);
- per-sound accuracy, and a confusion table for the pairs that matter for learners: す/つ,
  し/ち, じ/ぢ (same class), つ/ず, ふ/ほ/う, ら/だ/な, ん/む, short and long yōon (きょ/きよ),
  ぴゃ/びゃ;
- how often silence and noise are rejected as "no kana";
- calibration (does 80% mean right 80% of the time?).

**Go/no-go on held-out VOICEVOX voices:** top-1 ≥ 90% and top-3 ≥ 98%, す/つ and し/ち each
≥ 90% (stricter than for real voices, since these are clean synthetic speech). Then a first try
on your own voice in the app (Phase 4) shows whether it carries over. If it falls short, in
order:

1. more augmentation, more variation in prosody, a somewhat bigger model;
2. real speech: Mozilla Common Voice Japanese (CC0) cut into kana with forced alignment, to
   fine-tune on human voices;
3. fall back to Whisper in the browser for words, and keep the kana model only for the sounds it
   does well.

## Phase 3 — Running it in the browser

Plain TypeScript, no machine-learning library: the network is a handful of operations
(convolution, depthwise convolution, ReLU, average pooling, a dense layer), about 300 lines
that run in a Web Worker. That keeps the app small (TensorFlow.js would add ~1 MB, ONNX Runtime
Web several MB) and is easy to test. If a bigger architecture is ever needed, ONNX Runtime Web is
the fallback.

- `src/lib/speech/features.ts`: resampling to 16 kHz, FFT, mel filters, normalisation;
- `src/lib/speech/model.ts`: loads `public/models/kana-speech-v1.bin` (weights) and `.json`
  (classes, feature settings, version, temperature) and runs the network;
- `src/lib/speech/vad.ts`: energy-based voice activity detection: when speech starts, when it
  ends (or 1.5 s at most), and the 1 s window around it;
- `src/lib/speech/capture.ts`: microphone via an AudioWorklet (Safari and Chrome both support
  it), with echo cancellation, noise suppression and auto-gain **off**, which would distort the
  sound the model hears;
- `src/lib/speech/recognizer.ts`: `listenForKana(target?)` → `{ heard: [{ class, p }], score }`.

**Same maths in both languages:** golden test files (`tests/fixtures/speech/`) hold a few clips
with their features and output probabilities from Python; unit tests require TypeScript to match
to within 1e-4. That catches any drift between training and the app.

**Download and caching:** the model is fetched only when speaking is first used, then cached by
the service worker, so it works offline afterwards; it isn't part of the first load. The budget
test keeps the app's initial size where it is.

## Phase 4 — On the speech test page

A third column on `#/speech`: **Offline (kana model)**, next to the browser's recogniser, showing
its ranked guesses and probabilities for the same attempt. You can then compare both on your
iPhone and Mac, on your own voice, before anything depends on it.

## Phase 5 — "Say it" practice

A practice mode like Tracing: pick rows, see (or hear) each kana, say it.

- the result: ✓ with the score, or "sounded like つ" with the top guesses;
- **Again** / **Next**, and the end screen lists the kana that didn't come out right, with
  the usual full cards;
- logged as practice (`mode: 'speak'`): no schedule, not in accuracy (as tracing), but in the
  streak and calendar;
- "Hear it" plays the app's voice; record & compare stays available for any kana.

Later, if it proves reliable: a spoken answer style for normal study, and a spoken sprint.

## Phase 6 — Later ideas

- **Words:** a sequence model (CTC over kana) for words from the reading list; a much bigger
  step, only if single kana work well;
- **Personal calibration:** a few recordings of your own voice to tune thresholds (not to learn
  your mistakes);
- **Pitch accent:** the same pipeline could judge pitch patterns of words.

## Repository layout

```
ml/
  pyproject.toml            uv project (Python ≥ 3.12)
  VOICES.md                 licence check per VOICEVOX character
  classes.json              generated from src/lib/data/kana.ts
  kana_speech/
    classes.py  generate.py  augment.py  features.py  model.py
    train.py  evaluate.py  export.py
  reports/                  evaluation reports per model version (committed)
  data/                     generated audio, noise, test recordings (git-ignored)
public/models/
  kana-speech-v1.bin        weights (8-bit), < 1 MB
  kana-speech-v1.json       classes, feature settings, temperature, metrics
src/lib/speech/             features, model, vad, capture, recognizer (+ worker)
src/views/SpeechCollect.svelte   recording the real-voice test set
tests/fixtures/speech/      golden features and outputs from Python
```

Commands: `just ml-classes`, `just ml-data` (needs `just voicevox`), `just ml-train`,
`just ml-eval`, `just ml-export`.

## Tests

- **Unit:** features (FFT, mel, normalisation) and network against the Python golden files; VAD
  on synthetic signals; class mapping (お/を share a class); score calibration.
- **e2e:** with Chromium's fake microphone, an attempt runs end to end and shows a result; the
  model is loaded on demand and works offline after the first use.
- **Model:** `just ml-eval` must meet the go/no-go numbers before a new model version replaces the
  old one; the report is committed with the weights.

## Risks

| Risk | Mitigation |
| --- | --- |
| Synthetic voices don't carry over to real people | Noise, room, mic and codec augmentation; trying it on your voice early (Phase 4); then the real-voice test set and Common Voice fine-tuning |
| A voice's terms forbid training | Phase 0 audit; train only on allowed voices; ask rights holders |
| Learners' accents get rejected | Report both native and learner results; "sounded like…" feedback instead of a flat ✗; calibrated scores |
| iPhone audio quirks (48 kHz, earpiece routing, auto-gain) | Resample in the app; processing switched off; release the microphone after each attempt |
| Python and TypeScript features drift apart | Golden-file parity tests |
| Model size or speed on older phones | DS-CNN keeps it under 1 MB and a few ms; measured on your iPhone |

## Order of work and rough effort

1. **Phase 0:** licence audit (≈ 1 session). The collection page and real-voice test set come
   later.
2. **Phase 1–2:** data generation, first model, evaluation report → **go/no-go** (≈ 2–3 sessions,
   plus ~3 hours of unattended generation).
3. **Phase 3–4:** browser runtime and the test page column (≈ 2 sessions).
4. **Phase 5:** Say it practice (≈ 1 session).

## How it turned out

- **Licences (Phase 0)**: the check is in `ml/VOICES.md`. 25 characters (71 styles) may be
  used: one allows machine learning explicitly, the others don't mention it. 18 are left out:
  most forbid it, among them all six VirVox characters (and so the app's own male voice, 青山龍星),
  one asks to be contacted first, and two had unclear or unreadable terms. The usable voices
  lean female and young; frequency warping (vocal tract length) in training makes up for some of
  that, and a male voice (剣崎雌雄) is among the test voices.
- **Splits**: train 54 styles, validation 8 (九州そら, 春歌ナナ, 小夜/SAYO, †聖騎士 紅桜†), test 9
  (中国うさぎ, 雨晴はう, 波音リツ, 冥鳴ひまり, 剣崎雌雄).
- **Generation**: VOICEVOX on the CPU is the bottleneck: six engines with 2 threads each keep all
  cores busy at about 6 clips a second, so the 71 styles (≈ 45,000 clips) take about 2 hours.
- **Noise and rooms are synthetic**: MUSAN (11 GB) didn't fit on the disk, so noise is generated
  (white to brown, mains hum, babble from other clips) and so are room impulse responses
  (decaying noise, RT60 0.1–0.6 s).
- **No codec simulation**: the app records raw samples through an AudioWorklet, never AAC or
  Opus, so the model never hears a codec.
- **Features in both languages agree** to 1e-4 (`tests/unit/speech-model.test.ts` against
  `tests/fixtures/speech/parity.json`, written by `just ml-fixtures` from a network with fixed
  random weights, so the check doesn't depend on training).
- **Commands**: `just ml-classes`, `ml-engines`, `ml-data`, `ml-train`, `ml-eval`, `ml-export`,
  `ml-fixtures`, `ml-test`, `ml-engines-stop`.
- **Whispered styles are left out**: ささやき and ヒソヒソ (10 styles) have no voicing, so だ and た
  sound the same in them; they taught the model that voiced and voiceless kana are one sound.
- **Morphed voices**: VOICEVOX can morph between voices that allow it; 23 in-between voices of
  training characters were added. They didn't measurably help (30.5% vs 30.2% in a short run).

### Model v1 and why it's a no-go

`ml/reports/v1.md`: 192 channels, 6 blocks, 10 ms steps, mean and max pooling (283,000
parameters, 292 KB, about 120 ms per guess on the M4 in plain TypeScript), 50 epochs.

| Test voices (never heard) | Top-1 | Top-3 |
| --- | --- | --- |
| clean | 52% | 78% |
| noisy | 45% | 71% |
| room and noise | 39% | 65% |

す/つ is right 71% of the time and し/ち 74%; silence and noise are answered "no kana" 85% of the
time; probabilities are well calibrated. Most mistakes are voiced heard as voiceless (じ→ち, ぐ→く,
ど→と) and missed onsets (お→ほ).

What limits it is **too few distinct voices**, not the network: trained on 5 of the 6 variants of
each training voice, it gets 78% of the 6th variant right, but only 45% of new voices. Bigger
models, finer time steps, per-band normalisation, stronger regularisation and morphed voices each
changed the score by a few points at most. 25 characters (about 15 in training) is far from the
thousands of speakers such models usually learn from.

### Next steps

1. **Try it on real voices**: the speech test page shows the model's guesses next to the
   browser's; real voices may do better or worse than synthetic ones.
2. **Real speech**: Mozilla Common Voice Japanese (CC0, thousands of speakers), cut into kana
   with forced alignment, to train or fine-tune on.
3. **A pretrained speech encoder**: features from a model trained on many real voices (e.g. a
   small Whisper or wav2vec2 encoder) generalise across speakers far better; the cost is a much
   larger download (tens of MB) and a runtime such as ONNX Runtime Web.

