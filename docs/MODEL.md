# Model integration and preprocessing

## Artifacts

| File | Role |
| --- | --- |
| `sente_speak_float32.tflite` | Default runtime model, 6 softmax outputs |
| `sente_speak_dynamic_range.tflite` | Optional smaller runtime model |
| `labels.txt` | Canonical class order |
| `model_metadata.json` | Export metadata |
| `sente_speak_mobilenetv2.keras` | Training/export artifact; not used at runtime |

Expected class order (verified against `labels.txt` at startup):

```
0 UGX 1,000
1 UGX 2,000
2 UGX 5,000
3 UGX 10,000
4 UGX 20,000
5 UGX 50,000
```

Input tensor: `float32[1, 224, 224, 3]`, RGB. Output tensor: `float32[1, 6]` softmax scores.

## Preprocessing contract (important)

`model_metadata.json` states:

```
raw_pixel_range: [0, 255]
model_preprocessing: tf.keras.applications.mobilenet_v2.preprocess_input
```

The Keras export also contains the preprocessing **inside the graph**. Inspection of
`sente_speak_mobilenetv2.keras/config.json` shows these layers before `mobilenetv2_1.00_224`:

```
TrueDivide(..., 127.5)
Subtract(..., 1.0)
```

That is exactly `mobilenet_v2.preprocess_input`. Therefore the exported TFLite model expects
**raw 0–255 RGB floats** as external input. Applying `/127.5 - 1` again in the service double-normalizes
the image and destroys accuracy.

Verification on a sample of validation images (6 per class, 36 images):

| External input | Correct |
| --- | --- |
| raw 0–255 float32 | 36 / 36 |
| `/127.5 - 1` applied externally | 5 / 36 |

The full preprocessing chain still matches the training contract; the normalization simply happens
inside the model graph, exactly once.

`SENTE_INPUT_MODE` is centralized in `backend/app/config.py` and defaults to `raw_0_255` for this
export. If you re-export a model **without** fused preprocessing, set
`SENTE_INPUT_MODE=mobilenet_v2_preprocess` and the service will apply `x / 127.5 - 1` externally.

Pipeline in `backend/app/preprocessing.py`:

1. Validate extension/content type.
2. Decode with Pillow, verify JPG/PNG and readable image.
3. Convert to RGB.
4. Resize to 224×224 with bilinear interpolation (Pillow default used by Keras `load_img`).
5. Convert to float32 in 0–255 (or apply external mode only when configured).
6. Add batch dimension: `[1, 224, 224, 3]`.

## Runtime

`ai-edge-litert` (the maintained TensorFlow Lite runtime) loads the `.tflite` file. A process-wide
lock protects the interpreter because it is not guaranteed to be thread-safe. At load time the
service validates tensor count, shape, dtype and output size, and reads `labels.txt` from the same
folder.

No random, hardcoded or simulated inference exists in the application. Tests run the real model;
API tests monkeypatch scores only to verify mapping and rejection logic.

## Threshold tuning

The rejection policy is not calibrated here. To select thresholds:

1. Run the TFLite model over the validation split with the same preprocessing.
2. Collect `(top_probability, margin, correct)` per image.
3. Choose thresholds that meet the product's acceptable false-accept rate, keeping the uncertainty
   path safe for borderline images.
4. Set `SENTE_MIN_CONFIDENCE` and `SENTE_MIN_MARGIN` in `backend/.env` and rerun the tests.

`model_metadata.json` reports 94.3% test accuracy for the TFLite model; this is export metadata,
not a guarantee for every capture or device.
