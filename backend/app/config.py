"""Central configuration for the SENTE SPEAK inference service."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Environment-driven settings. All variables use the SENTE_ prefix."""

    model_config = SettingsConfigDict(
        env_prefix="SENTE_", env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    model_dir: str = ""
    model_file: str = "sente_speak_float32.tflite"
    labels_file: str = "labels.txt"
    metadata_file: str = "model_metadata.json"
    input_mode: str = "raw_0_255"
    min_confidence: float = 0.60
    min_margin: float = 0.20
    max_upload_bytes: int = 12 * 1024 * 1024
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    app_version: str = "1.0.0"

    @field_validator("input_mode")
    @classmethod
    def _check_input_mode(cls, value: str) -> str:
        if value not in {"raw_0_255", "mobilenet_v2_preprocess"}:
            raise ValueError(
                "SENTE_INPUT_MODE must be raw_0_255 or mobilenet_v2_preprocess"
            )
        return value

    @field_validator("min_confidence")
    @classmethod
    def _check_confidence(cls, value: float) -> float:
        if not 0.0 <= value <= 1.0:
            raise ValueError("SENTE_MIN_CONFIDENCE must be between 0 and 1")
        return value

    @field_validator("min_margin")
    @classmethod
    def _check_margin(cls, value: float) -> float:
        if value < 0.0:
            raise ValueError("SENTE_MIN_MARGIN must be zero or greater")
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


@dataclass(frozen=True)
class UncertaintyPolicy:
    """Rules for accepting or rejecting a model prediction.

    These defaults are starting values only. They must be tuned on the
    validation split before the application is used operationally.
    """

    min_confidence: float = 0.60
    min_margin: float = 0.20

    @property
    def description(self) -> str:
        return (
            f"Accept only when top probability >= {self.min_confidence:.2f} "
            f"and the gap to the runner-up >= {self.min_margin:.2f}. "
            "Thresholds are provisional and require validation-set tuning."
        )


@dataclass(frozen=True)
class ModelPaths:
    directory: Path
    model_path: Path
    labels_path: Path
    metadata_path: Path
    source: str


def resolve_model_paths(settings: Settings | None = None) -> ModelPaths:
    """Locate model artifacts without requiring manual configuration."""

    settings = settings or get_settings()
    if settings.model_dir:
        directory = Path(settings.model_dir).expanduser()
        if not directory.is_absolute():
            directory = Path.cwd() / directory
        source = "SENTE_MODEL_DIR"
    else:
        candidates = (
            (BACKEND_DIR / "models", "backend/models"),
            (APP_DIR.parent / "export", "export"),
        )
        directory, source = next(
            ((path, label) for path, label in candidates if path.is_dir()), candidates[0]
        )

    directory = directory.resolve()
    return ModelPaths(
        directory=directory,
        model_path=directory / settings.model_file,
        labels_path=directory / settings.labels_file,
        metadata_path=directory / settings.metadata_file,
        source=source,
    )


def cors_origin_list(settings: Settings | None = None) -> list[str]:
    settings = settings or get_settings()
    return [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]


def policy_from_settings(settings: Settings | None = None) -> UncertaintyPolicy:
    settings = settings or get_settings()
    return UncertaintyPolicy(min_confidence=settings.min_confidence, min_margin=settings.min_margin)
