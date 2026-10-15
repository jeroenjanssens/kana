"""The sound classes, from classes.json (written by `just ml-classes` from the app's kana)."""

import json
from functools import cache
from pathlib import Path

CLASSES_FILE = Path(__file__).resolve().parent.parent / "classes.json"
VOICES_FILE = Path(__file__).resolve().parent.parent / "voices.json"

#: Classes are the sounds in classes.json order, then "no kana" last.
NO_KANA_INDEX = 101


@cache
def load_classes() -> list[dict]:
    data = json.loads(CLASSES_FILE.read_text())
    classes = data["classes"]
    assert len(classes) == NO_KANA_INDEX, "update NO_KANA_INDEX to the number of sounds"
    return classes


def class_ids() -> list[str]:
    """All class ids, including "no kana" ("_") last."""
    data = json.loads(CLASSES_FILE.read_text())
    return [c["id"] for c in data["classes"]] + [data["noKana"]]


#: Whispered styles have no voicing, so だ sounds like た and じ like ち: they'd teach the model
#: that these are the same sound. Learners don't whisper at the app, so these aren't used.
WHISPERED = {"ささやき", "ヒソヒソ"}


@cache
def load_voices(whispered: bool = False) -> list[dict]:
    """The VOICEVOX styles we may train on, with their split (train, val or test)."""
    voices = json.loads(VOICES_FILE.read_text())
    return voices if whispered else [v for v in voices if v["style"] not in WHISPERED]
