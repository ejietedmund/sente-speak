"""Configurable uncertainty/rejection policy for model predictions."""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .config import UncertaintyPolicy
from .denominations import ClassLabel

ACCEPTED = "accepted"
LOW_CONFIDENCE = "low_confidence"
AMBIGUOUS = "ambiguous"
INVALID_OUTPUT = "invalid_output"

UNCERTAIN_MESSAGES = {
    LOW_CONFIDENCE: "I'm not sure about this banknote. Please reposition it and try again.",
    AMBIGUOUS: "I'm not sure about this banknote. Please reposition it and try again.",
    INVALID_OUTPUT: "The recognition service returned an invalid result. Please try again.",
}


@dataclass(frozen=True)
class Decision:
    accepted: bool
    reason: str
    scores: np.ndarray
    confidence: float
    margin: float
    top_index: int
    runner_up_index: int | None

    @property
    def message(self) -> str:
        return UNCERTAIN_MESSAGES.get(self.reason, UNCERTAIN_MESSAGES[LOW_CONFIDENCE])

    def alternatives(self, labels: tuple[ClassLabel, ...], limit: int = 3) -> list[tuple[ClassLabel, float]]:
        order = np.argsort(-self.scores)
        result: list[tuple[ClassLabel, float]] = []
        for index in order[:limit]:
            position = int(index)
            if position < len(labels):
                result.append((labels[position], float(self.scores[position])))
        return result

    def winning_label(self, labels: tuple[ClassLabel, ...]) -> ClassLabel | None:
        if self.top_index < len(labels):
            return labels[self.top_index]
        return None


def evaluate(probabilities: np.ndarray, policy: UncertaintyPolicy) -> Decision:
    """Apply confidence and margin thresholds; never guess when uncertain."""

    scores = np.asarray(probabilities, dtype=np.float64).flatten()
    if scores.size < 2 or not np.all(np.isfinite(scores)) or not math.isclose(
        float(scores.sum()), 1.0, rel_tol=0.02, abs_tol=0.02
    ):
        return Decision(False, INVALID_OUTPUT, scores, 0.0, 0.0, 0, None)

    order = np.argsort(-scores)
    top_index = int(order[0])
    runner_up_index = int(order[1])
    confidence = float(scores[top_index])
    margin = confidence - float(scores[runner_up_index])

    if confidence < policy.min_confidence:
        reason = LOW_CONFIDENCE
    elif margin < policy.min_margin:
        reason = AMBIGUOUS
    else:
        reason = ACCEPTED

    return Decision(
        accepted=reason == ACCEPTED,
        reason=reason,
        scores=scores,
        confidence=confidence,
        margin=margin,
        top_index=top_index,
        runner_up_index=runner_up_index,
    )
