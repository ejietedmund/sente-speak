# SENTE SPEAK API

Base URL (development): `http://127.0.0.1:8000`.
Interactive OpenAPI documentation: `/docs`.

## `GET /api/health`

Reports service and model availability. Always succeeds, even when the model is missing.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "model": {
    "available": true,
    "architecture": "MobileNetV2",
    "input_size": 224,
    "class_count": 6,
    "input_mode": "raw_0_255",
    "color_order": "RGB",
    "preprocessing": "tf.keras.applications.mobilenet_v2.preprocess_input",
    "model_file": ".../sente_speak_float32.tflite",
    "source": "backend/models"
  },
  "policy": {
    "min_confidence": 0.6,
    "min_margin": 0.2,
    "description": "Accept only when top probability >= 0.60 and the gap to the runner-up >= 0.20..."
  },
  "message": ""
}
```

When the model is unavailable, `status` is `"model_unavailable"` and `model` includes `reason`
and `hint`.

## `GET /api/config`

Returns the six denominations in trained class order, the active policy and upload limits.

```json
{
  "version": "1.0.0",
  "denominations": [
    { "index": 0, "label": "UGX 1,000", "key": "1000", "speech_en": "One thousand Ugandan Shillings" }
  ],
  "policy": { "min_confidence": 0.6, "min_margin": 0.2, "description": "..." },
  "model": { "available": true, "class_count": 6, "input_mode": "raw_0_255" },
  "accepted_formats": ["JPG", "JPEG", "PNG"],
  "max_upload_bytes": 12582912
}
```

## `POST /api/recognize`

Multipart form field: `file` (JPG, JPEG or PNG, max 12 MB by default).

### Recognized response (200)

```json
{
  "status": "recognized",
  "denomination": "UGX 10,000",
  "denomination_key": "10000",
  "spoken_text": "Ten thousand Ugandan Shillings",
  "class_index": 3,
  "confidence": 0.9976,
  "margin": 0.9952,
  "alternatives": [
    { "index": 3, "label": "UGX 10,000", "key": "10000", "confidence": 0.9976 }
  ],
  "model": { "available": true, "input_mode": "raw_0_255" },
  "processing_ms": 101.5,
  "disclaimer": "Identifies the denomination only; it does not verify authenticity."
}
```

Confidence is diagnostic metadata, not a guarantee of correctness. The frontend deliberately does
not present it as a promise.

### Uncertain response (200)

```json
{
  "status": "uncertain",
  "message": "I'm not sure about this banknote. Please reposition it and try again.",
  "reason": "low_confidence",
  "confidence": 0.31,
  "margin": 0.05,
  "top": { "index": 1, "label": "UGX 2,000", "key": "2000", "confidence": 0.31 },
  "alternatives": [],
  "model": { "available": true, "input_mode": "raw_0_255" },
  "processing_ms": 49.4,
  "disclaimer": "Identifies the denomination only; it does not verify authenticity."
}
```

An uncertain response never contains `denomination`, `denomination_key` or `spoken_text`.
Rejection reasons: `low_confidence`, `ambiguous`, `invalid_output`.

### Error responses

All errors use the same shape:

```json
{
  "error": {
    "code": "unsupported_format",
    "message": "Only JPG, JPEG and PNG images are supported.",
    "hint": "Choose a .jpg, .jpeg or .png file and try again.",
    "retryable": true
  }
}
```

| Status | Code | Cause |
| --- | --- | --- |
| 400 | `missing_image` | No `file` field was supplied |
| 400 | `unsupported_format` | Extension, content type or decoded format is not JPG/PNG |
| 400 | `empty_image` / `corrupt_image` | Empty or unreadable image data |
| 400 | `image_too_small` / `image_too_large` | Image dimensions outside supported bounds |
| 400 | `file_too_large` | Upload exceeds `SENTE_MAX_UPLOAD_BYTES` |
| 503 | `model_unavailable` | Model/labels missing, invalid or runtime not installed |
| 500 | `inference_failed` | Inference runtime or output validation failed |
| 500 | `internal_error` | Unexpected server error |

The frontend turns each code into a spoken and visual message with actionable next steps.
Network failures and timeouts are reported separately by the API client.

## Uncertainty policy

A prediction is accepted only when both conditions hold:

```
top_probability >= SENTE_MIN_CONFIDENCE
top_probability - second_probability >= SENTE_MIN_MARGIN
```

Defaults are `0.60` and `0.20`. They are provisional and must be selected using validation data;
softmax confidence alone is not treated as correctness.
