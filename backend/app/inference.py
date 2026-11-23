"""Loading and running the actual trained MobileNetV2 TFLite model."""

from __future__ import annotations

import threading
from dataclasses import dataclass

import numpy as np

from .config import Settings, get_settings, resolve_model_paths
from .denominations import ClassLabel, load_class_labels, read_metadata
from .errors import AppError, InferenceFailureError, ModelUnavailableError
from .preprocessing import INPUT_SIZE

_LOCK = threading.RLock()
_MODEL: LoadedModel | None = None


@dataclass(frozen=True)
class LoadedModel:
    interpreter: object
    labels: tuple[ClassLabel, ...]
    input_index: int
    output_index: int
    model_path: str
    source: str
    metadata: dict[str, object]


def load_model(settings: Settings | None = None, *, force_reload: bool = False) -> LoadedModel:
    """Load and validate the model once, using a process-wide lock."""

    global _MODEL
    with _LOCK:
        if _MODEL is not None and not force_reload:
            return _MODEL

        try:
            from ai_edge_litert.interpreter import Interpreter
        except ImportError as exc:
            raise ModelUnavailableError(
                "The TFLite runtime is not installed on the server.",
                hint="Install backend requirements (ai-edge-litert) and restart the service.",
            ) from exc

        paths = resolve_model_paths(settings)
        if not paths.model_path.is_file():
            raise ModelUnavailableError(
                f"Model file not found: {paths.model_path}",
                hint="Copy sente_speak_float32.tflite into backend/models or set SENTE_MODEL_DIR.",
            )

        labels = load_class_labels(paths.labels_path)
        try:
            interpreter = Interpreter(model_path=str(paths.model_path), num_threads=1)
            interpreter.allocate_tensors()
        except Exception as exc:
            raise ModelUnavailableError(
                "The model file could not be loaded.",
                hint="Verify the .tflite file is intact and was exported for TensorFlow Lite.",
            ) from exc

        inputs = interpreter.get_input_details()
        outputs = interpreter.get_output_details()
        if len(inputs) != 1 or len(outputs) != 1:
            raise ModelUnavailableError(
                "The model must have exactly one input and one output tensor.",
                hint="Use the exported SENTE SPEAK MobileNetV2 TFLite model.",
            )

        input_detail = inputs[0]
        output_detail = outputs[0]
        expected_shape = [1, INPUT_SIZE[0], INPUT_SIZE[1], 3]
        if list(input_detail["shape"]) != expected_shape:
            raise ModelUnavailableError(
                f"Unexpected model input shape: {list(input_detail['shape'])}.",
                hint=f"The SENTE SPEAK model expects {expected_shape}.",
            )
        if np.dtype(input_detail["dtype"]) != np.float32:
            raise ModelUnavailableError(
                "The model input must be float32.",
                hint="Use the exported float32 TFLite model (not a quantised variant).",
            )
        if list(output_detail["shape"])[-1] != 6:
            raise ModelUnavailableError(
                "The model output must contain six class scores.",
                hint="Use the exported six-class SENTE SPEAK model.",
            )

        _MODEL = LoadedModel(
            interpreter=interpreter,
            labels=labels,
            input_index=int(input_detail["index"]),
            output_index=int(output_detail["index"]),
            model_path=str(paths.model_path),
            source=paths.source,
            metadata=read_metadata(paths.metadata_path),
        )
        return _MODEL


def predict_proba(batch: np.ndarray) -> np.ndarray:
    """Run real inference and return the six softmax scores as float64."""

    model = load_model()
    array = np.ascontiguousarray(batch, dtype=np.float32)
    expected_shape = (1, INPUT_SIZE[0], INPUT_SIZE[1], 3)
    if array.shape != expected_shape:
        raise InferenceFailureError(
            "The prepared image has an unexpected shape.",
            hint="Retry the scan; if it continues, contact the system administrator.",
        )

    with _LOCK:
        try:
            model.interpreter.set_tensor(model.input_index, array)
            model.interpreter.invoke()
            output = np.array(model.interpreter.get_tensor(model.output_index), dtype=np.float64).reshape(-1)
        except Exception as exc:
            raise InferenceFailureError(
                "Image recognition could not be completed.",
                hint="Try again with a clear photo of one complete banknote.",
            ) from exc

    if output.size != 6 or not np.all(np.isfinite(output)):
        raise InferenceFailureError(
            "The recognition service returned an invalid result.",
            hint="Please try the scan again.",
        )
    return output


def model_status(settings: Settings | None = None) -> dict[str, object]:
    """Report availability without raising, for the health endpoint."""

    try:
        model = load_model(settings)
    except AppError as exc:
        return {
            "available": False,
            "code": exc.code,
            "reason": exc.message,
            "hint": exc.hint,
        }

    input_info = model.metadata.get("input", {})
    output_info = model.metadata.get("output", {})
    return {
        "available": True,
        "input_mode": (settings or get_settings()).input_mode,
        "model_file": model.model_path,
        "source": model.source,
        "architecture": model.metadata.get("architecture", "MobileNetV2"),
        "input_size": INPUT_SIZE[0],
        "color_order": input_info.get("color_order", "RGB") if isinstance(input_info, dict) else "RGB",
        "preprocessing": (
            input_info.get("model_preprocessing", "mobilenet_v2.preprocess_input")
            if isinstance(input_info, dict)
            else "mobilenet_v2.preprocess_input"
        ),
        "class_count": output_info.get("class_count", len(model.labels))
        if isinstance(output_info, dict)
        else len(model.labels),
    }
