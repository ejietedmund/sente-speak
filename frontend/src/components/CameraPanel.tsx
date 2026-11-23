import type { RefObject } from "react";
import { Button } from "./Button";
import { StatusBanner } from "./StatusBanner";
import type { CameraError, CameraStatus } from "../hooks/useCamera";

interface CameraPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: CameraError | null;
  canSwitch: boolean;
  onCapture: () => void;
  onRetry: () => void;
  onSwitch: () => void;
  onCancel: () => void;
  onUploadInstead: () => void;
}

export function CameraPanel({
  videoRef,
  status,
  error,
  canSwitch,
  onCapture,
  onRetry,
  onSwitch,
  onCancel,
  onUploadInstead,
}: CameraPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border-2 border-line bg-surface p-4">
        <p className="font-bold">Before you capture</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-base">
          <li>Place the whole banknote inside the frame.</li>
          <li>Use even light and avoid glare or shadows.</li>
          <li>Hold the device steady while capturing.</li>
        </ul>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-primary bg-ink">
        <video
          ref={videoRef}
          aria-label="Camera preview"
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${status === "ready" ? "" : "opacity-0"}`}
        />
        {status === "ready" && (
          <>
            <div className="camera-frame absolute inset-0" aria-hidden="true" />
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-ink/85 px-4 py-2 text-sm font-semibold text-white">
              Fit the whole banknote inside the frame
            </p>
          </>
        )}
        {status === "requesting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink px-6 text-center text-lg font-semibold text-white">
            <p role="status">Waiting for camera permission…</p>
          </div>
        )}
        {status === "error" && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface px-4">
            <div className="w-full max-w-md">
              <StatusBanner tone="error" title={error.message}>
                {error.hint}
              </StatusBanner>
            </div>
          </div>
        )}
      </div>

      {status === "error" && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={onRetry}>Try camera again</Button>
          <Button variant="secondary" onClick={onUploadInstead}>
            Upload image instead
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={onCapture} disabled={status !== "ready"} icon="◎">
          Capture and identify
        </Button>
        {canSwitch && status === "ready" && (
          <Button variant="secondary" onClick={onSwitch}>
            Switch camera
          </Button>
        )}
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
