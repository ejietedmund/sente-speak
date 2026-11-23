"""Uncertainty policy must reject weak or ambiguous predictions."""

from __future__ import annotations

import numpy as np
import pytest

from app.config import UncertaintyPolicy
from app.policy import ACCEPTED, AMBIGUOUS, INVALID_OUTPUT, LOW_CONFIDENCE, evaluate


def _scores(*values: float) -> np.ndarray:
    array = np.array(values, dtype=np.float64)
    return array / array.sum()


def test_confident_prediction_is_accepted() -> None:
    decision = evaluate(_scores(0.92, 0.03, 0.02, 0.01, 0.01, 0.01), UncertaintyPolicy())
    assert decision.accepted
    assert decision.reason == ACCEPTED
    assert decision.top_index == 0
    assert decision.confidence == pytest.approx(0.92)


def test_low_confidence_is_rejected() -> None:
    decision = evaluate(_scores(0.30, 0.25, 0.20, 0.15, 0.06, 0.04), UncertaintyPolicy())
    assert not decision.accepted
    assert decision.reason == LOW_CONFIDENCE
    assert "not sure" in decision.message.lower()


def test_ambiguous_prediction_is_rejected() -> None:
    lower_confidence_floor = UncertaintyPolicy(min_confidence=0.50, min_margin=0.20)
    decision = evaluate(_scores(0.51, 0.49, 0, 0, 0, 0), lower_confidence_floor)
    assert not decision.accepted
    assert decision.reason == AMBIGUOUS


def test_custom_thresholds_are_applied() -> None:
    scores = _scores(0.75, 0.20, 0.02, 0.01, 0.01, 0.01)
    strict = UncertaintyPolicy(min_confidence=0.90, min_margin=0.10)
    assert evaluate(scores, strict).reason == LOW_CONFIDENCE

    lenient = UncertaintyPolicy(min_confidence=0.70, min_margin=0.60)
    assert evaluate(scores, lenient).reason == AMBIGUOUS


def test_invalid_scores_are_rejected() -> None:
    assert evaluate(np.array([0.5, np.nan, 0, 0, 0, 0]), UncertaintyPolicy()).reason == INVALID_OUTPUT
    assert evaluate(np.array([0.1, 0.1]), UncertaintyPolicy()).reason == INVALID_OUTPUT
