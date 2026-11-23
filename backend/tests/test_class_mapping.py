"""Class order and label-to-denomination mapping tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.config import get_settings, resolve_model_paths
from app.denominations import EXPECTED_LABELS, load_class_labels
from app.errors import ModelUnavailableError


def test_exported_labels_match_expected_class_order() -> None:
    labels = load_class_labels(resolve_model_paths(get_settings()).labels_path)
    assert len(labels) == 6
    assert [label.label for label in labels] == list(EXPECTED_LABELS)
    assert [label.key for label in labels] == ["1000", "2000", "5000", "10000", "20000", "50000"]
    assert [label.index for label in labels] == list(range(6))
    assert labels[3].speech_en == "Ten thousand Ugandan Shillings"


def test_numeric_index_prefixes_are_tolerated(tmp_path: Path) -> None:
    path = tmp_path / "labels.txt"
    path.write_text("\n".join(f"{i} - {label}" for i, label in enumerate(EXPECTED_LABELS)), encoding="utf-8")
    assert [label.key for label in load_class_labels(path)] == [
        "1000",
        "2000",
        "5000",
        "10000",
        "20000",
        "50000",
    ]


def test_wrong_class_order_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "labels.txt"
    reordered = list(EXPECTED_LABELS)
    reordered[0], reordered[1] = reordered[1], reordered[0]
    path.write_text("\n".join(reordered), encoding="utf-8")
    with pytest.raises(ModelUnavailableError):
        load_class_labels(path)
