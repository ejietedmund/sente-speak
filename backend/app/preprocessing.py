"""Image validation and the exact MobileNetV2 preprocessing contract."""

from __future__ import annotations

import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageFile, UnidentifiedImageError

from .errors import ImageValidationError

INPUT_SIZE = (224, 224)
ALLOWED_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png"})
ALLOWED_FORMATS = frozenset({"JPEG", "PNG"})
ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "application/octet-stream", ""})
MIN_IMAGE_DIMENSION = 32
MAX_IMAGE_PIXELS = 20_000_000
PREPROCESS_SCALE = 127.5
PREPROCESS_OFFSET = 1.0
INPUT_MODES = frozenset({"raw_0_255", "mobilenet_v2_preprocess"})

ImageFile.LOAD_TRUNCATED_IMAGES = False


def validate_upload(filename: str, content_type: str) -> None:
    """Reject unsupported uploads early, with an actionable message."""

    extension = Path(filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ImageValidationError(
            "Only JPG, JPEG and PNG images are supported.",
            code="unsupported_format",
            hint="Choose a .jpg, .jpeg or .png file and try again.",
        )

    normalised_type = (content_type or "").split(";")[0].strip().lower()
    if normalised_type not in ALLOWED_CONTENT_TYPES:
        raise ImageValidationError(
            f"Unsupported image type: {normalised_type or 'unknown'}.",
            code="unsupported_format",
            hint="Choose a .jpg, .jpeg or .png file and try again.",
        )


def decode_image(data: bytes) -> Image.Image:
    """Decode bytes to an RGB image, rejecting corrupt or oversized files."""

    if not data:
        raise ImageValidationError(
            "No image data was received.",
            code="empty_image",
            hint="Select a banknote image and try again.",
        )

    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.format not in ALLOWED_FORMATS:
                raise ImageValidationError(
                    f"Unsupported image format: {image.format or 'unknown'}.",
                    code="unsupported_format",
                    hint="Choose a .jpg, .jpeg or .png file and try again.",
                )
            width, height = image.size
            if width < MIN_IMAGE_DIMENSION or height < MIN_IMAGE_DIMENSION:
                raise ImageValidationError(
                    "The image is too small to identify a banknote.",
                    code="image_too_small",
                    hint="Use an image of at least 32 by 32 pixels.",
                )
            if width * height > MAX_IMAGE_PIXELS:
                raise ImageValidationError(
                    "The image is too large to process.",
                    code="image_too_large",
                    hint="Use a smaller photograph of the banknote.",
                )
            rgb = image.convert("RGB")
            rgb.load()
    except ImageValidationError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError) as exc:
        raise ImageValidationError(
            "The selected image could not be read.",
            code="corrupt_image",
            hint="Choose a different JPG or PNG image and try again.",
        ) from exc

    return rgb


def preprocess_image(image: Image.Image, mode: str = "raw_0_255") -> np.ndarray:
    """Return a float32 NHWC batch using the exported model's input contract.

    The shipped SENTE SPEAK export already contains the MobileNetV2
    preprocess_input layers (TrueDivide 127.5, Subtract 1.0) inside the graph.
    Feeding raw 0-255 pixels therefore applies the full contract exactly once.
    Set mode="mobilenet_v2_preprocess" only for a re-export whose graph omits
    those layers.
    """

    if mode not in INPUT_MODES:
        raise ValueError(f"Unknown input mode: {mode}")

    rgb = image if image.mode == "RGB" else image.convert("RGB")
    resized = rgb.resize(INPUT_SIZE, Image.Resampling.BILINEAR)
    pixels = np.asarray(resized, dtype=np.float32)
    processed = (
        pixels if mode == "raw_0_255" else pixels / PREPROCESS_SCALE - PREPROCESS_OFFSET
    )
    batch = np.expand_dims(processed, axis=0)
    return np.ascontiguousarray(batch, dtype=np.float32)
