import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, recognizeImage } from "../config/api";
import type { RecognitionResult } from "../types";

export type RecognitionOutcome =
  | { ok: true; result: RecognitionResult }
  | { ok: false; error: ApiError };

export function useRecognition() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const controller = useRef<AbortController | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const run = useCallback(async (file: File): Promise<RecognitionOutcome> => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const timeout = window.setTimeout(() => active.abort(), 45000);
    setProcessing(true);
    setError(null);

    try {
      const result = await recognizeImage(file, active.signal);
      return { ok: true, result };
    } catch (caught) {
      let failure: ApiError;
      if (caught instanceof DOMException && caught.name === "AbortError") {
        failure = new ApiError(
          {
            code: "timeout",
            message: "Recognition took too long.",
            hint: "Try again with a clearer photo of the whole banknote.",
            retryable: true,
          },
          0,
        );
      } else if (caught instanceof ApiError) {
        failure = caught;
      } else {
        failure = new ApiError(
          {
            code: "unexpected_error",
            message: "Recognition could not be completed.",
            hint: "Please try again with a clear photo of one banknote.",
            retryable: true,
          },
          0,
        );
      }
      setError(failure);
      return { ok: false, error: failure };
    } finally {
      window.clearTimeout(timeout);
      setProcessing(false);
      controller.current = null;
    }
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  return { processing, error, run, resetError };
}
