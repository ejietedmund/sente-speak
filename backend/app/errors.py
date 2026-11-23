"""Typed application errors with actionable, user-facing messages."""

from __future__ import annotations


class AppError(Exception):
    """Base error rendered by the API as a structured JSON response."""

    status_code = 500
    code = "internal_error"
    retryable = False

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        hint: str = "",
        retryable: bool | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        self.hint = hint
        if retryable is not None:
            self.retryable = retryable

    def as_dict(self) -> dict[str, object]:
        return {
            "code": self.code,
            "message": self.message,
            "hint": self.hint,
            "retryable": self.retryable,
        }


class ImageValidationError(AppError):
    status_code = 400
    code = "invalid_image"
    retryable = True


class ModelUnavailableError(AppError):
    status_code = 503
    code = "model_unavailable"
    retryable = False


class InferenceFailureError(AppError):
    status_code = 500
    code = "inference_failed"
    retryable = True
