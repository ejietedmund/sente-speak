"""The preprocessing contract must match MobileNetV2 exactly."""

from __future__ import annotations

import io

import numpy as np
import pytest
from PIL import Image

from app.errors import ImageValidationError
from app.preprocessing import decode_image, preprocess_image, validate_upload


def _image_bytes(image: Image.Image, fmt: str = "PNG") -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()


def test_preprocess_default_keeps_raw_zero_to_255_pixels() -> None:
    pixels = np.zeros((224, 224, 3), dtype=np.uint8)
    pixels[:, :, 0] = 0
    pixels[:, :, 1] = 128
    pixels[:, :, 2] = 255
    image = Image.fromarray(pixels, mode="RGB")

    batch = preprocess_image(image)

    assert batch.shape == (1, 224, 224, 3)
    assert batch.dtype == np.float32
    assert batch[0, 0, 0].tolist() == pytest.approx([0.0, 128.0, 255.0])


def test_external_normalisation_mode_applies_mobilenet_preprocess_input() -> None:
    pixels = np.zeros((224, 224, 3), dtype=np.uint8)
    pixels[:, :, 1] = 128
    pixels[:, :, 2] = 255
    image = Image.fromarray(pixels, mode="RGB")

    batch = preprocess_image(image, "mobilenet_v2_preprocess")

    assert batch.shape == (1, 224, 224, 3)
    assert batch[0, 0, 0, 0] == pytest.approx(-1.0)
    assert batch[0, 0, 0, 1] == pytest.approx(128 / 127.5 - 1.0, abs=1e-6)
    assert batch[0, 0, 0, 2] == pytest.approx(1.0)


def test_preprocess_resizes_to_224_and_uses_rgb() -> None:
    image = Image.new("RGBA", (100, 50), (10, 20, 30, 255))
    batch = preprocess_image(image)
    assert batch.shape == (1, 224, 224, 3)


def test_validate_upload_accepts_supported_formats() -> None:
    validate_upload("note.jpg", "image/jpeg")
    validate_upload("note.png", "image/png")
    validate_upload("note.JPEG", "")


def test_validate_upload_rejects_other_formats() -> None:
    with pytest.raises(ImageValidationError) as error:
        validate_upload("note.gif", "image/gif")
    assert error.value.code == "unsupported_format"


def test_decode_image_converts_to_rgb() -> None:
    image = decode_image(_image_bytes(Image.new("RGBA", (80, 80), (1, 2, 3, 128))))
    assert image.mode == "RGB"
    assert image.getpixel((0, 0)) == (1, 2, 3)


def test_decode_image_rejects_corrupt_and_empty_data() -> None:
    with pytest.raises(ImageValidationError) as error:
        decode_image(b"this is not an image")
    assert error.value.code == "corrupt_image"

    with pytest.raises(ImageValidationError) as error:
        decode_image(b"")
    assert error.value.code == "empty_image"


def test_decode_image_rejects_non_jpeg_png_payload() -> None:
    payload = _image_bytes(Image.new("RGB", (80, 80), "red"), fmt="GIF")
    with pytest.raises(ImageValidationError) as error:
        decode_image(payload)
    assert error.value.code == "unsupported_format"
