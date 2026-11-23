import type { ApiErrorBody, HealthResponse, RecognitionResult } from "../types";

const baseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  readonly code: string;
  readonly hint: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(body: ApiErrorBody, status: number) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.hint = body.hint;
    this.retryable = body.retryable;
    this.status = status;
  }
}

function networkError(): ApiError {
  return new ApiError(
    {
      code: "network_unavailable",
      message: "The recognition service could not be reached.",
      hint: "Check that the SENTE SPEAK backend is running, then try again.",
      retryable: true,
    },
    0,
  );
}

async function request<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw networkError();
  }

  if (!response.ok) {
    let body: ApiErrorBody = {
      code: "request_failed",
      message: `The service returned an error (${response.status}).`,
      hint: "Please try again.",
      retryable: true,
    };
    const parsed: unknown = await response.json().catch(() => null);
    if (
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      parsed.error &&
      typeof parsed.error === "object"
    ) {
      const candidate = parsed.error as Partial<ApiErrorBody>;
      body = {
        code: candidate.code ?? body.code,
        message: candidate.message ?? body.message,
        hint: candidate.hint ?? body.hint,
        retryable: candidate.retryable ?? body.retryable,
      };
    }
    throw new ApiError(body, response.status);
  }

  return (await response.json()) as T;
}

export function recognizeImage(file: File, signal?: AbortSignal): Promise<RecognitionResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  return request<RecognitionResult>("/api/recognize", { method: "POST", body: form }, signal);
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health", { method: "GET" }, signal);
}
