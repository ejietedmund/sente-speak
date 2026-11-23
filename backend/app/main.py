"""SENTE SPEAK inference API.

Endpoints:
  GET  /api/health     - service and model availability
  GET  /api/config     - class order, policy, upload limits
  POST /api/recognize  - multipart form field "file" -> recognition result
  GET  /docs           - interactive OpenAPI documentation
"""

from __future__ import annotations

import logging
import time

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__
from .config import cors_origin_list, get_settings, policy_from_settings
from .denominations import EXPECTED_LABELS
from .errors import AppError, ImageValidationError, InferenceFailureError
from .inference import load_model, model_status, predict_proba
from .policy import Decision, evaluate
from .preprocessing import decode_image, preprocess_image, validate_upload
from .schemas import (
    ClassPrediction,
    ConfigResponse,
    DenominationInfo,
    HealthResponse,
    ModelInfo,
    PolicyInfo,
    RecognitionResult,
    RecognizedResult,
    UncertainResult,
)

logger = logging.getLogger("sente_speak")
DISCLAIMER = "Identifies the denomination only; it does not verify authenticity."

app = FastAPI(
    title="SENTE SPEAK API",
    description="Ugandan banknote denomination recognition for assistive technology.",
    version=__version__,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origin_list(settings),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": exc.as_dict()})


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    missing_file = any("file" in error.get("loc", ()) for error in errors)
    message = "A banknote image is required." if missing_file else "The request could not be understood."
    error = ImageValidationError(
        message,
        code="missing_image" if missing_file else "invalid_request",
        hint="Select a JPG or PNG image and try again.",
        retryable=True,
    )
    return JSONResponse(status_code=error.status_code, content={"error": error.as_dict()})


@app.exception_handler(Exception)
async def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled SENTE SPEAK error", exc_info=exc)
    error = InferenceFailureError(
        "Something went wrong while processing your request.",
        hint="Please try again. If the problem continues, restart the application.",
    )
    return JSONResponse(status_code=error.status_code, content={"error": error.as_dict()})


def _model_info() -> ModelInfo:
    return ModelInfo(**model_status(get_settings()))


def _policy_info() -> PolicyInfo:
    policy = policy_from_settings(get_settings())
    return PolicyInfo(
        min_confidence=policy.min_confidence,
        min_margin=policy.min_margin,
        description=policy.description,
    )


def _prediction(label, confidence: float) -> ClassPrediction:
    return ClassPrediction(
        index=label.index, label=label.label, key=label.key, confidence=confidence
    )


async def _read_upload(file: UploadFile, limit: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise ImageValidationError(
                "The selected image is too large.",
                code="file_too_large",
                hint="Choose an image smaller than 12 MB and try again.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    info = _model_info()
    return HealthResponse(
        status="ok" if info.available else "model_unavailable",
        version=__version__,
        model=info,
        policy=_policy_info(),
        message="" if info.available else "Recognition is unavailable until the model is configured.",
    )


@app.get("/api/config", response_model=ConfigResponse, tags=["system"])
async def config() -> ConfigResponse:
    config_settings = get_settings()
    model = load_model(config_settings)
    return ConfigResponse(
        version=__version__,
        denominations=[
            DenominationInfo(
                index=label.index, label=label.label, key=label.key, speech_en=label.speech_en
            )
            for label in model.labels
        ],
        policy=_policy_info(),
        model=_model_info(),
        max_upload_bytes=config_settings.max_upload_bytes,
    )


@app.post("/api/recognize", response_model=RecognitionResult, tags=["recognition"])
async def recognize(file: UploadFile = File(...)) -> RecognitionResult:
    """Classify one banknote image using the real trained model."""

    config_settings = get_settings()
    validate_upload(file.filename or "", file.content_type or "")
    data = await _read_upload(file, config_settings.max_upload_bytes)
    image = decode_image(data)
    batch = preprocess_image(image, config_settings.input_mode)

    started = time.perf_counter()
    probabilities = predict_proba(batch)
    processing_ms = round((time.perf_counter() - started) * 1000, 1)

    model = load_model(config_settings)
    decision: Decision = evaluate(probabilities, policy_from_settings(config_settings))
    alternatives = [
        _prediction(label, score) for label, score in decision.alternatives(model.labels, limit=3)
    ]

    if decision.accepted:
        label = decision.winning_label(model.labels)
        if label is None:
            raise InferenceFailureError(
                "The recognition result could not be interpreted.",
                hint="Please try the scan again.",
            )
        return RecognizedResult(
            status="recognized",
            denomination=label.label,
            denomination_key=label.key,
            spoken_text=label.speech_en,
            class_index=label.index,
            confidence=decision.confidence,
            margin=decision.margin,
            alternatives=alternatives,
            model=_model_info(),
            processing_ms=processing_ms,
            disclaimer=DISCLAIMER,
        )

    top_prediction = None
    if decision.reason != "invalid_output":
        label = decision.winning_label(model.labels)
        top_prediction = _prediction(label, decision.confidence) if label else None

    return UncertainResult(
        status="uncertain",
        message=decision.message,
        reason=decision.reason,
        confidence=decision.confidence,
        margin=decision.margin,
        top=top_prediction,
        alternatives=alternatives,
        model=_model_info(),
        processing_ms=processing_ms,
        disclaimer=DISCLAIMER,
    )


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "application": "SENTE SPEAK",
        "message": "Use /api/recognize for inference and /docs for API documentation.",
        "expected_classes": ", ".join(EXPECTED_LABELS),
    }
