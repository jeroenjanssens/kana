"""Generate training speech with VOICEVOX: every sound in every voice style, in several variants.

    uv run python -m kana_speech.generate [--styles 2,3,8] [--engines 50021,50022] [--jobs 3]

Needs the engine (`just voicevox`); several engines (`just ml-engines`) share the styles out. Each style is saved to data/clips/{style}.npz (16 kHz int16
clips, concatenated, with offsets and labels) and skipped when it already exists, so a run can
be stopped and resumed. Only voices in voices.json are generated: the ones whose terms allow
this use (see VOICES.md).
"""

import argparse
import asyncio
import json
import random
from pathlib import Path

import httpx
import numpy as np
from tqdm import tqdm

from .classes import NO_KANA_INDEX, load_classes, load_voices
from .features import SAMPLE_RATE

ENGINE = "http://localhost:50021"
DATA = Path(__file__).resolve().parent.parent / "data"
VARIANTS = 6
#: Morphed voices add variety between voices, so fewer variants each.
MORPH_VARIANTS = 4
#: "No kana" utterances per style: two kana run together (カサ), which aren't one kana.
PAIRS = 24
VOICELESS = {"s", "sh", "k", "ts", "ch", "h", "f", "p", "t"}


def variant(rng: random.Random, n: int) -> dict:
    """Prosody for variant n: 0 neutral, 1 the app's own style, then random."""
    if n == 0:
        return {
            "speed": 1.0,
            "pitch": 0.0,
            "intonation": 1.0,
            "stretch": 1.0,
            "weak": 0.0,
            "hiss": 0.0,
        }
    if n == 1:
        return {
            "speed": 1.0,
            "pitch": 0.0,
            "intonation": 1.0,
            "stretch": 1.0,
            "weak": 0.28,
            "hiss": 0.18,
        }
    return {
        "speed": rng.uniform(0.85, 1.25),
        "pitch": rng.uniform(-0.08, 0.08),
        "intonation": rng.uniform(0.7, 1.4),
        "stretch": rng.uniform(1.0, 1.6),
        "weak": rng.choice([0.0, 0.0, rng.uniform(0.15, 0.35)]),
        "hiss": rng.choice([0.0, rng.uniform(0.12, 0.22)]),
    }


async def synthesize(
    client: httpx.AsyncClient,
    notation: str,
    style: int,
    p: dict,
    morph: tuple[int, float] | None = None,
) -> np.ndarray:
    """Synthesise one utterance; with `morph` (other style, rate), a voice between the two."""
    q = (await client.post("/audio_query", params={"text": "あ", "speaker": style})).json()
    phrases = (
        await client.post(
            "/accent_phrases", params={"text": notation, "speaker": style, "is_kana": "true"}
        )
    ).json()
    for mora in (m for ph in phrases for m in ph["moras"]):
        mora["vowel_length"] *= p["stretch"]
        if (mora.get("consonant") or "") in VOICELESS and mora["vowel"] in ("u", "i"):
            mora["vowel_length"] = max(mora["vowel_length"], p["weak"])
        if mora.get("consonant") in ("s", "sh"):
            mora["consonant_length"] = max(mora["consonant_length"], p["hiss"])
    q.update(
        accent_phrases=phrases,
        speedScale=p["speed"],
        pitchScale=p["pitch"],
        intonationScale=p["intonation"],
        prePhonemeLength=0.1,
        postPhonemeLength=0.1,
        outputSamplingRate=SAMPLE_RATE,
        outputStereo=False,
    )
    if morph:
        target, rate = morph
        params = {"base_speaker": style, "target_speaker": target, "morph_rate": rate}
        res = await client.post("/synthesis_morphing", params=params, json=q, timeout=60)
    else:
        res = await client.post("/synthesis", params={"speaker": style}, json=q, timeout=60)
    res.raise_for_status()
    return trim(wav_samples(res.content))


def wav_samples(wav: bytes) -> np.ndarray:
    """The samples of a 16-bit mono WAV file (VOICEVOX's output), as float32 in [-1, 1]."""
    i = wav.index(b"data") + 8
    return np.frombuffer(wav[i:], dtype="<i2").astype(np.float32) / 32768


def trim(audio: np.ndarray, margin: float = 0.03) -> np.ndarray:
    """Cut the silence around the sound (below -45 dB of the peak), keeping a small margin."""
    frame = 160
    n = len(audio) // frame
    energy = (audio[: n * frame].reshape(n, frame) ** 2).mean(axis=1)
    loud = np.flatnonzero(energy > energy.max() * 10 ** (-45 / 10))
    if not len(loud):
        return audio
    pad = int(margin * SAMPLE_RATE)
    start = max(0, loud[0] * frame - pad)
    end = min(len(audio), (loud[-1] + 1) * frame + pad)
    return audio[start:end]


async def generate_style(
    style: int | str, classes: list[dict], engine: str, jobs: int, variants: int = VARIANTS
) -> None:
    """One voice: a VOICEVOX style id, or a morph "m{base}-{target}-{rate}" of two styles."""
    out = DATA / "clips" / f"{style}.npz"
    if out.exists():
        return
    morph = None
    speaker = style
    if isinstance(style, str):
        base, target, rate = style[1:].split("-")
        speaker, morph = int(base), (int(target), int(rate) / 100)
    rng = random.Random(str(style))
    work: list[tuple[int, str, dict]] = []
    for label, c in enumerate(classes):
        for n in range(variants):
            work.append((label, c["notation"], variant(rng, n)))
    plain = [c["notation"].rstrip("'") for c in classes]
    for _ in range(PAIRS):
        a, b = rng.sample(plain, 2)
        work.append((NO_KANA_INDEX, f"{a}{b}'", variant(rng, rng.randrange(VARIANTS))))

    clips: list[np.ndarray | None] = [None] * len(work)
    limit = asyncio.Semaphore(jobs)
    async with httpx.AsyncClient(base_url=engine, timeout=60) as client:

        async def one(i: int):
            _label, notation, p = work[i]
            async with limit:
                # An engine can drop a request (or restart when it runs out of memory): try again.
                for attempt in range(5):
                    try:
                        clips[i] = await synthesize(client, notation, speaker, p, morph)
                        return
                    except (httpx.TransportError, httpx.HTTPStatusError, json.JSONDecodeError):
                        if attempt == 4:
                            raise
                        await asyncio.sleep(5 * (attempt + 1))

        await asyncio.gather(*(one(i) for i in range(len(work))))

    audio = [np.round(c * 32767).astype(np.int16) for c in clips]
    offsets = np.cumsum([0] + [len(a) for a in audio])
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp.npz")
    np.savez(
        tmp,
        audio=np.concatenate(audio),
        offsets=offsets,
        labels=np.array([w[0] for w in work], dtype=np.int16),
        style=style,
    )
    tmp.rename(out)


def all_styles() -> list[dict]:
    speakers = httpx.get(f"{ENGINE}/speakers").json()
    return [
        {"character": s["name"], "style": st["name"], "id": st["id"]}
        for s in speakers
        for st in s["styles"]
        if st.get("type", "talk") == "talk"
    ]


def morph_voices(per_pair: int = 2) -> list[str]:
    """In-between voices of training characters whose terms allow morphing with any voice: more
    distinct voices to learn from. Validation and test voices are never used."""
    allowed = {
        s["name"]
        for s in httpx.get(f"{ENGINE}/speakers").json()
        if s.get("supported_features", {}).get("permitted_synthesis_morphing") == "ALL"
    }
    by_character: dict[str, list[int]] = {}
    for v in load_voices():
        if v["split"] == "train" and v["character"] in allowed:
            by_character.setdefault(v["character"], []).append(v["id"])
    rng = random.Random(1)
    names = sorted(by_character)
    out = []
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            for _ in range(per_pair):
                base, target = rng.choice(by_character[a]), rng.choice(by_character[b])
                out.append(f"m{base}-{target}-{rng.randint(30, 70)}")
    return out


async def run(ids: list[int | str], engines: list[str], jobs: int) -> None:
    """Each engine works through its own queue of styles."""
    classes = load_classes()
    queue: asyncio.Queue[int] = asyncio.Queue()
    for style in ids:
        queue.put_nowait(style)
    progress = tqdm(total=len(ids), desc="styles")

    async def worker(engine: str):
        while not queue.empty():
            style = queue.get_nowait()
            try:
                variants = MORPH_VARIANTS if isinstance(style, str) else VARIANTS
                await generate_style(style, classes, engine, jobs, variants)
                progress.update()
            except Exception as err:  # noqa: BLE001 — an engine that keeps failing drops out
                print(f"\n{engine} failed on style {style} ({err!r}); leaving it to the others")
                queue.put_nowait(style)
                return

    await asyncio.gather(*(worker(e) for e in engines))
    progress.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--styles", help="comma-separated style ids (default: voices.json)")
    parser.add_argument("--engines", default="50021", help="comma-separated engine ports")
    parser.add_argument("--jobs", type=int, default=3, help="requests in parallel per engine")
    parser.add_argument("--morphs", type=int, default=0, help="generate this many morphed voices")
    args = parser.parse_args()
    styles = all_styles()
    DATA.mkdir(exist_ok=True)
    (DATA / "styles.json").write_text(json.dumps(styles, ensure_ascii=False, indent=1))
    allowed = {v["id"] for v in load_voices(whispered=True)}
    ids: list[int | str] = (
        [int(s) for s in args.styles.split(",")] if args.styles else sorted(allowed)
    )
    if not set(ids) <= allowed:
        raise SystemExit(f"not in voices.json: {sorted(set(ids) - allowed)}")
    engines = [f"http://localhost:{p}" for p in args.engines.split(",")]
    if args.morphs:
        ids = morph_voices()[: args.morphs]
        (DATA / "morphs.json").write_text(json.dumps(ids))
    asyncio.run(run(ids, engines, args.jobs))


if __name__ == "__main__":
    main()
