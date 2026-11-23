"""HTTP contract and error-handling tests."""

from __future__ import annotations

import io

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.errors import ModelUnavailableError
from app.main import app

client = TestClient(app, raise_server_exceptions=False)


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (224, 224), (40, 80, 120)).save(buffer, format="PNG")
    return buffer.getvalue()


def _recognize(files: dict, monkeypatch=None) -> tuple[int, dict]:
    response = client.post("/api/recognize", files=files)
    return response.status_code, response.json()


def test_health_reports_model_availability() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "model_unavailable"}
    assert body["model"]["class_count"] == 6
    assert 0 <= body["policy"]["min_confidence"] <= 1


def test_config_lists_six_denominations_in_order() -> None:
    response = client.get("/api/config")
    assert response.status_code == 200
    denominations = response.json()["denominations"]
    assert [item["label"] for item in denominations] == [
        "UGX 1,000",
        "UGX 2,000",
        "UGX 5,000",
        "UGX 10,000",
        "UGX 20,000",
        "UGX 50,000",
    ]


def test_recognize_returns_structured_result_from_real_model() -> None:
    status, body = _recognize({"file": ("note.png", _png_bytes(), "image/png")})
    assert status == 200
    assert body["status"] in {"recognized", "uncertain"}
    assert "model" in body and "disclaimer" in body
    assert len(body["alternatives"]) <= 3


def test_accepted_prediction_maps_to_correct_denomination(monkeypatch) -> None:
    scores = np.array([0.0, 0.0, 0.0, 0.94, 0.04, 0.02])
    monkeypatch.setattr("app.main.predict_proba", lambda _batch: scores)
    status, body = _recognize({"file": ("note.png", _png_bytes(), "image/png")})
    assert status == 200
    assert body["status"] == "recognized"
    assert body["denomination"] == "UGX 10,000"
    assert body["denomination_key"] == "10000"
    assert body["spoken_text"] == "Ten thousand Ugandan Shillings"
    assert body["class_index"] == 3


def test_rejected_prediction_never_returns_a_denomination(monkeypatch) -> None:
    scores = np.array([0.22, 0.20, 0.19, 0.18, 0.11, 0.10])
    monkeypatch.setattr("app.main.predict_proba", lambda _batch: scores)
    status, body = _recognize({"file": ("note.png", _png_bytes(), "image/png")})
    assert status == 200
    assert body["status"] == "uncertain"
    assert "denomination" not in body
    assert "not sure" in body["message"].lower()


def test_unsupported_format_and_corrupt_image_are_rejected() -> None:
    status, body = _recognize({"file": ("note.gif", b"GIF89a", "image/gif")})
    assert status == 400
    assert body["error"]["code"] == "unsupported_format"

    status, body = _recognize({"file": ("broken.png", b"not an image", "image/png")})
    assert status == 400
    assert body["error"]["code"] == "corrupt_image"


def test_missing_file_returns_actionable_error() -> None:
    response = client.post("/api/recognize", data={})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "missing_image"


def test_model_unavailable_returns_503(monkeypatch) -> None:
    def unavailable(_batch):
        raise ModelUnavailableError("The model is not configured.")

    monkeypatch.setattr("app.main.predict_proba", unavailable)
    status, body = _recognize({"file": ("note.png", _png_bytes(), "image/png")})
    assert status == 503
    assert body["error"]["code"] == "model_unavailable"
