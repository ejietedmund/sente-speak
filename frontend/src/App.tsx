import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { Button } from "./components/Button";
import { CameraPanel } from "./components/CameraPanel";
import { ProcessingPanel } from "./components/ProcessingPanel";
import { ResultCard } from "./components/ResultCard";
import { StatusBanner } from "./components/StatusBanner";
import { UncertainPanel } from "./components/UncertainPanel";
import { UploadPanel } from "./components/UploadPanel";
import { fetchHealth } from "./config/api";
import { languageConfig, resolveDenominationSpeech } from "./config/languages";
import { AnnouncerProvider, useAnnouncer } from "./context/AnnouncerContext";
import { AccessibilityProvider, useAccessibility } from "./context/AccessibilityContext";
import { useCamera } from "./hooks/useCamera";
import { useRecognition } from "./hooks/useRecognition";
import { useSpeech } from "./hooks/useSpeech";
import { AboutPage } from "./pages/AboutPage";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import type { HealthResponse, LanguageCode, RecognitionResult, SpeechStatus, View } from "./types";

function labelForSpeech(status: SpeechStatus, enabled: boolean, language: LanguageCode): string {
  if (!enabled) return "Speech: off";
  switch (status) {
    case "speaking":
      return "Speech: speaking now";
    case "unavailable":
      return "Speech: unavailable in this browser";
    case "failed":
      return "Speech: playback failed";
    case "no-voice":
      return "Speech: fallback voice in use";
    default:
      return `Speech: on · ${languageConfig[language].label}`;
  }
}

function messageForSpeech(status: SpeechStatus, message: string | undefined, enabled: boolean): string {
  if (!enabled) return "Speech playback is off. Results are still shown on screen.";
  if (message) return message;
  if (status === "unavailable") {
    return "This browser has no speech synthesis. Read results on screen or try another browser.";
  }
  return "Recognized results and important errors will be spoken automatically.";
}

function AppContent() {
  const [view, setView] = useState<View>("home");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);

  const { preferences, setPreference, resetPreferences } = useAccessibility();
  const { announce } = useAnnouncer();
  const { status: speechStatus, lastOutcome, speak, cancel } = useSpeech();
  const { processing, error: recognitionError, run, resetError } = useRecognition();
  const camera = useCamera();

  const loadHealth = useCallback(async () => {
    try {
      const response = await fetchHealth();
      setHealth(response);
      setHealthError(null);
      if (!response.model.available) {
        announce(
          "Recognition is unavailable. The model is not configured on the server.",
          "assertive",
        );
      }
    } catch {
      setHealth(null);
      setHealthError("The recognition service could not be reached. Check that the backend is running.");
      announce("The recognition service could not be reached.", "assertive");
    }
  }, [announce]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = useCallback(
    (selected: File) => {
      setFile(selected);
      setResult(null);
      resetError();
      setPreviewUrl(URL.createObjectURL(selected));
      announce(`Image selected: ${selected.name}. Choose Identify banknote.`);
    },
    [announce, resetError],
  );

  const removeFile = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    announce("Image removed. Choose another image.");
  }, [announce]);

  const speakResult = useCallback(
    async (text: string) => {
      const outcome = await speak({
        text,
        language: preferences.language,
        repetitions: preferences.speechRepetition,
        enabled: preferences.speechEnabled,
      });
      announce(outcome.message, outcome.played ? "polite" : "assertive");
    },
    [announce, preferences.language, preferences.speechEnabled, preferences.speechRepetition, speak],
  );

  const recognise = useCallback(
    async (image: File) => {
      if (processing) return;
      const outcome = await run(image);
      if (!outcome.ok) {
        announce(`${outcome.error.message} ${outcome.error.hint}`, "assertive");
        return;
      }

      setResult(outcome.result);
      if (outcome.result.status === "recognized") {
        const resolved = resolveDenominationSpeech(preferences.language, outcome.result.denomination_key);
        setView("result");
        announce(
          `${outcome.result.spoken_text}. ${resolved.notice}`.trim(),
          "polite",
        );
        await speakResult(`Detected denomination: ${resolved.text}.`);
      } else {
        setView("uncertain");
        announce(outcome.result.message, "assertive");
        if (preferences.speechEnabled) {
          await speakResult("I'm not sure about this banknote. Please reposition it and try again.");
        }
      }
    },
    [announce, preferences.language, preferences.speechEnabled, processing, run, speakResult],
  );

  const openCamera = useCallback(() => {
    setResult(null);
    setView("camera");
    announce("Scan screen. Camera access is requested now.");
    void camera.start("environment");
  }, [announce, camera]);

  const openUpload = useCallback(() => {
    setResult(null);
    setView("upload");
    announce("Upload screen. Choose a JPG or PNG banknote image.");
  }, [announce]);

  const navigate = useCallback(
    (next: View) => {
      camera.stop();
      cancel();
      setView(next);
    },
    [camera, cancel],
  );

  const goHome = useCallback(() => {
    navigate("home");
    announce("Returned to the main screen.");
  }, [announce, navigate]);

  const handleCapture = useCallback(async () => {
    const captured = await camera.capture();
    if (!captured) {
      announce("The camera image could not be captured. Please try again.", "assertive");
      return;
    }
    selectFile(captured);
    await recognise(captured);
  }, [announce, camera, recognise, selectFile]);

  const replay = useCallback(async () => {
    if (!result || result.status !== "recognized") return;
    const resolved = resolveDenominationSpeech(preferences.language, result.denomination_key);
    await speakResult(`Detected denomination: ${resolved.text}.`);
  }, [preferences.language, result, speakResult]);

  const testSpeech = useCallback(async () => {
    const resolved = resolveDenominationSpeech(preferences.language, "10000");
    await speakResult(`Detected denomination: ${resolved.text}.`);
  }, [preferences.language, speakResult]);

  const speechLabel = labelForSpeech(speechStatus, preferences.speechEnabled, preferences.language);
  const speechMessage = messageForSpeech(speechStatus, lastOutcome?.message, preferences.speechEnabled);
  const isFlowView = ["camera", "upload", "result", "uncertain"].includes(view);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:p-3 focus:font-bold focus:text-ink"
      >
        Skip to main content
      </a>
      <AppHeader view={view} onNavigate={navigate} speechLabel={speechLabel} />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6" aria-busy={processing}>
        {recognitionError && !processing && (
          <div className="mb-5">
            <StatusBanner tone="error" title={recognitionError.message}>
              <p>{recognitionError.hint}</p>
              <Button variant="secondary" className="mt-3" onClick={resetError}>
                Dismiss
              </Button>
            </StatusBanner>
          </div>
        )}

        {view === "home" && (
          <HomePage
            health={health}
            healthErrorMessage={healthError}
            language={preferences.language}
            speechLabel={speechLabel}
            speechMessage={speechMessage}
            onLanguageChange={(language) => setPreference("language", language)}
            onScan={openCamera}
            onUpload={openUpload}
            onSettings={() => navigate("settings")}
            onRefreshHealth={() => void loadHealth()}
          />
        )}

        {view === "camera" && (
          <div className="flex flex-col gap-5">
            <h1 id="page-heading" className="text-3xl font-extrabold sm:text-4xl">
              Scan a banknote
            </h1>
            <p>The camera is used only while this screen is open.</p>
            {processing ? (
              <ProcessingPanel />
            ) : (
              <CameraPanel
                videoRef={camera.videoRef}
                status={camera.status}
                error={camera.error}
                canSwitch={camera.canSwitch}
                onCapture={() => void handleCapture()}
                onRetry={() => void camera.start()}
                onSwitch={() => void camera.switchCamera()}
                onCancel={goHome}
                onUploadInstead={openUpload}
              />
            )}
          </div>
        )}

        {view === "upload" && (
          <div className="flex flex-col gap-5">
            <h1 id="page-heading" className="text-3xl font-extrabold sm:text-4xl">
              Upload a banknote photo
            </h1>
            <p>Choose a clear photo, check the preview, then identify the banknote.</p>
            {processing ? (
              <ProcessingPanel />
            ) : (
              <UploadPanel
                file={file}
                previewUrl={previewUrl}
                onSelect={selectFile}
                onRemove={removeFile}
                onIdentify={() => file && void recognise(file)}
                onCancel={goHome}
              />
            )}
          </div>
        )}

        {view === "result" && result?.status === "recognized" && (
          <div className="flex flex-col gap-5">
            <h1 id="page-heading" className="sr-only">
              Recognition result
            </h1>
            <ResultCard
              result={result}
              speechStatus={speechStatus}
              speechMessage={speechMessage}
              onReplay={() => void replay()}
              onScanAnother={openCamera}
              onHome={goHome}
            />
          </div>
        )}

        {view === "uncertain" && result?.status === "uncertain" && (
          <div className="flex flex-col gap-5">
            <h1 id="page-heading" className="sr-only">
              Uncertain recognition result
            </h1>
            <UncertainPanel
              result={result}
              onTryAgain={() => file && void recognise(file)}
              onCaptureAnother={openCamera}
              onHome={goHome}
            />
          </div>
        )}

        {view === "settings" && (
          <SettingsPage
            preferences={preferences}
            onPreferenceChange={setPreference}
            onReset={resetPreferences}
            onTestSpeech={() => void testSpeech()}
            speechMessage={speechMessage}
            onHome={goHome}
          />
        )}

        {view === "about" && <AboutPage onHome={goHome} />}

        {isFlowView && (
          <p className="mt-6 text-sm text-muted">
            SENTE SPEAK identifies denominations only. It does not verify authenticity.
          </p>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <AnnouncerProvider>
        <AppContent />
      </AnnouncerProvider>
    </AccessibilityProvider>
  );
}
