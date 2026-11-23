"""The single source of truth for class order and denomination metadata."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from .errors import ModelUnavailableError

EXPECTED_LABELS: tuple[str, ...] = (
    "UGX 1,000",
    "UGX 2,000",
    "UGX 5,000",
    "UGX 10,000",
    "UGX 20,000",
    "UGX 50,000",
)

ENGLISH_SPEECH: dict[str, str] = {
    "1000": "One thousand Ugandan Shillings",
    "2000": "Two thousand Ugandan Shillings",
    "5000": "Five thousand Ugandan Shillings",
    "10000": "Ten thousand Ugandan Shillings",
    "20000": "Twenty thousand Ugandan Shillings",
    "50000": "Fifty thousand Ugandan Shillings",
}

_INDEX_PREFIX = re.compile(r"^\s*\d+\s*[-:.]\s*")


@dataclass(frozen=True)
class ClassLabel:
    index: int
    label: str
    key: str
    speech_en: str


def _normalise_line(line: str) -> str:
    return _INDEX_PREFIX.sub("", line).strip()


def _key_from_label(label: str) -> str:
    digits = re.sub(r"\D", "", label)
    if digits not in ENGLISH_SPEECH:
        raise ModelUnavailableError(
            f"Unsupported denomination in labels file: {label!r}.",
            hint="Expected the six labels UGX 1,000 through UGX 50,000.",
        )
    return digits


def load_class_labels(labels_path: Path) -> tuple[ClassLabel, ...]:
    """Read labels.txt and verify it matches the trained class order."""

    try:
        lines = [line for line in labels_path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    except OSError as exc:
        raise ModelUnavailableError(
            f"Could not read the label file at {labels_path}.",
            hint="Place labels.txt beside the .tflite model or set SENTE_MODEL_DIR.",
        ) from exc

    labels = tuple(_normalise_line(line) for line in lines)
    if tuple(labels) != EXPECTED_LABELS:
        raise ModelUnavailableError(
            "The label file does not match the expected six-class order.",
            hint=f"Expected {', '.join(EXPECTED_LABELS)} in that exact order.",
        )

    return tuple(
        ClassLabel(
            index=index,
            label=label,
            key=_key_from_label(label),
            speech_en=ENGLISH_SPEECH[_key_from_label(label)],
        )
        for index, label in enumerate(labels)
    )


def read_metadata(metadata_path: Path) -> dict[str, object]:
    """Return model metadata when present; missing metadata is not fatal."""

    if not metadata_path.is_file():
        return {}
    try:
        value = json.loads(metadata_path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}
