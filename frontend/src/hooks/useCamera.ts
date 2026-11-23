import { useCallback, useEffect, useRef, useState } from "react";

export type FacingMode = "environment" | "user";

export interface CameraError {
  code: "permission_denied" | "no_camera" | "camera_busy" | "camera_error" | "camera_unsupported";
  message: string;
  hint: string;
}

export type CameraStatus = "idle" | "requesting" | "ready" | "error";

function mapCameraError(error: unknown): CameraError {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      code: "permission_denied",
      message: "Camera permission was denied.",
      hint: "Allow camera access in your browser settings, then select Try camera again.",
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      code: "no_camera",
      message: "No camera was found on this device.",
      hint: "Use Upload Image instead, or connect a camera and try again.",
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      code: "camera_busy",
      message: "The camera is already in use.",
      hint: "Close other apps using the camera, then select Try camera again.",
    };
  }
  return {
    code: "camera_error",
    message: "The camera could not be started.",
    hint: "Check the camera connection or use Upload Image instead.",
  };
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<CameraError | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [canSwitch, setCanSwitch] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(
    async (mode: FacingMode = facingMode): Promise<boolean> => {
      stop();
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setError({
          code: "camera_unsupported",
          message: "This browser does not support camera access.",
          hint: "Use Upload Image instead, or open the app in a modern browser over HTTPS.",
        });
        return false;
      }

      setStatus("requesting");
      setFacingMode(mode);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const devices = navigator.mediaDevices.enumerateDevices
          ? await navigator.mediaDevices.enumerateDevices()
          : [];
        setCanSwitch(devices.filter((device) => device.kind === "videoinput").length > 1);
        setStatus("ready");
        return true;
      } catch (caught) {
        stop();
        setStatus("error");
        setError(mapCameraError(caught));
        return false;
      }
    },
    [facingMode, stop],
  );

  const switchCamera = useCallback(async () => {
    const next: FacingMode = facingMode === "environment" ? "user" : "environment";
    await start(next);
  }, [facingMode, start]);

  const capture = useCallback((): Promise<File | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return Promise.resolve(null);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return Promise.resolve(null);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], "banknote.jpg", { type: "image/jpeg" }) : null),
        "image/jpeg",
        0.92,
      );
    });
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, status, error, facingMode, canSwitch, start, stop, switchCamera, capture };
}
