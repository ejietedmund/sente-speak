"""API request/response models shared across the service."""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str
    message: str
    hint: str = ""
    retryable: bool = False


class ErrorResponse(BaseModel):
    error: ErrorBody


class PolicyInfo(BaseModel):
    min_confidence: float
    min_margin: float
    description: str


class ModelInfo(BaseModel):
    available: bool
    architecture: str = "MobileNetV2"
    input_size: int = 224
    class_count: int = 6
    model_file: str = ""
    source: str = ""
    color_order: str = "RGB"
    preprocessing: str = "mobilenet_v2.preprocess_input"
    input_mode: str = "raw_0_255"
    reason: str = ""
    hint: str = ""


class HealthResponse(BaseModel):
    status: Literal["ok", "model_unavailable"]
    version: str
    model: ModelInfo
    policy: PolicyInfo
    message: str = ""


class DenominationInfo(BaseModel):
    index: int
    label: str
    key: str
    speech_en: str


class ClassPrediction(BaseModel):
    index: int
    label: str
    key: str
    confidence: float


class RecognizedResult(BaseModel):
    status: Literal["recognized"]
    denomination: str
    denomination_key: str
    spoken_text: str
    class_index: int
    confidence: float
    margin: float
    alternatives: list[ClassPrediction]
    model: ModelInfo
    processing_ms: float
    disclaimer: str = "Identifies the denomination only; it does not verify authenticity."


class UncertainResult(BaseModel):
    status: Literal["uncertain"]
    message: str
    reason: str
    confidence: float
    margin: float
    top: ClassPrediction | None = None
    alternatives: list[ClassPrediction]
    model: ModelInfo
    processing_ms: float
    disclaimer: str = "Identifies the denomination only; it does not verify authenticity."


RecognitionResult = Annotated[
    Union[RecognizedResult, UncertainResult], Field(discriminator="status")
]


class ConfigResponse(BaseModel):
    version: str
    denominations: list[DenominationInfo]
    policy: PolicyInfo
    model: ModelInfo
    accepted_formats: list[str] = ["JPG", "JPEG", "PNG"]
    max_upload_bytes: int
