"""Real-model inference smoke tests using the exported TFLite artifact."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from app.config import APP_DIR, UncertaintyPolicy
from app.denominations import load_class_labels
from app.inference import load_model, predict_proba
from app.policy import evaluate
from app.preprocessing import preprocess_image


def test_real_model_returns_six_softmax_scores() -> None:
    image = Image.new("RGB", (224, 224), (30, 60, 90))
    probabilities = predict_proba(preprocess_image(image))

    assert probabilities.shape == (6,)
    assert np.all(np.isfinite(probabilities))
    assert probabilities.sum() == pytest.approx(1.0, abs=0.02)
    assert 0 <= int(np.argmax(probabilities)) <= 5


def test_loaded_model_metadata_matches_class_contract() -> None:
    model = load_model()
    assert len(model.labels) == 6
    assert model.labels[3].label == "UGX 10,000"
    assert model.labels[5].key == "50000"
    assert model.labels == load_class_labels(Path(model.model_path).parent / "labels.txt")


VALIDATION_IMAGE = (
    APP_DIR.parent
    / "ugx_dataset_224"
    / "val"
    / "10k"
    / "cls_UGX_genuine_0088.jpg"
)


@pytest.mark.skipif(not VALIDATION_IMAGE.exists(), reason="validation image not present")
def test_known_validation_image_is_classified_correctly() -> None:
    with Image.open(VALIDATION_IMAGE) as image:
        probabilities = predict_proba(preprocess_image(image))
    assert int(probabilities.argmax()) == 3
    assert probabilities.max() >= 0.60


def test_predictions_can_be_interpreted_by_policy() -> None:
    image = Image.new("RGB", (224, 224), (120, 120, 120))
    decision = evaluate(predict_proba(preprocess_image(image)), UncertaintyPolicy())
    assert 0 <= decision.top_index <= 5
    assert isinstance(decision.accepted, bool)
