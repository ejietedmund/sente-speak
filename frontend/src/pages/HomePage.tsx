import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { LanguageSelect } from "../components/LanguageSelect";
import { StatusBanner } from "../components/StatusBanner";
import type { HealthResponse, LanguageCode } from "../types";

interface HomePageProps {
  health: HealthResponse | null;
  healthErrorMessage: string | null;
  language: LanguageCode;
  speechLabel: string;
  speechMessage: string;
  onLanguageChange: (language: LanguageCode) => void;
  onScan: () => void;
  onUpload: () => void;
  onSettings: () => void;
  onRefreshHealth: () => void;
}

export function HomePage({
  health,
  healthErrorMessage,
  language,
  speechLabel,
  speechMessage,
  onLanguageChange,
  onScan,
  onUpload,
  onSettings,
  onRefreshHealth,
}: HomePageProps) {
  const modelReady = health?.model.available === true;
  const unavailableMessage = health?.model.reason || "Recognition service is not ready.";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 id="page-heading" className="text-3xl font-extrabold sm:text-4xl">
          Identify a banknote by voice
        </h1>
        <p className="mt-3 max-w-2xl text-lg">
          SENTE SPEAK recognizes six Ugandan Shilling denominations from a photo or camera image and
          speaks the result aloud.
        </p>
      </div>

      {healthErrorMessage && (
        <StatusBanner tone="error" title="The recognition service could not be reached">
          {healthErrorMessage}
        </StatusBanner>
      )}

      {health && !modelReady && (
        <StatusBanner tone="error" title="Recognition is currently unavailable">
          <p>{unavailableMessage}</p>
          {health.model.hint && <p className="mt-1">{health.model.hint}</p>}
          <Button variant="secondary" className="mt-3" onClick={onRefreshHealth}>
            Check again
          </Button>
        </StatusBanner>
      )}

      <Card labelledBy="main-actions-heading">
        <h2 id="main-actions-heading" className="sr-only">
          Main actions
        </h2>
        <p className="text-xl font-bold">
          {modelReady || healthErrorMessage
            ? "Choose how you want to capture the banknote."
            : "Recognition becomes available when the model is ready."}
        </p>
        <p className="mt-2 text-base text-muted">
          Position the complete banknote in good light for the best result.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button onClick={onScan} disabled={!modelReady && !healthErrorMessage} icon="◎" fullWidth>
            Scan Banknote
          </Button>
          <Button
            variant="secondary"
            onClick={onUpload}
            disabled={!modelReady && !healthErrorMessage}
            icon="＋"
            fullWidth
          >
            Upload Image
          </Button>
        </div>
      </Card>

      <Card labelledBy="audio-heading">
        <h2 id="audio-heading" className="text-xl font-bold">
          Audio and language
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <LanguageSelect value={language} onChange={onLanguageChange} />
          <div className="flex flex-col gap-2">
            <p className="font-bold">Speech status</p>
            <p className="rounded-control border-2 border-line bg-paper px-4 py-3 font-semibold">
              {speechLabel}
            </p>
            <p className="text-sm text-muted">{speechMessage}</p>
            <Button variant="ghost" className="self-start px-0" onClick={onSettings}>
              Open accessibility settings
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Accessibility</h2>
        <p className="mt-2">
          Press Tab to move between controls, then Enter or Space to select. Recognition results and
          errors are announced automatically.
        </p>
        <p className="mt-2 text-sm text-muted">
          Need larger text, high contrast or repeated speech? Open Settings.
        </p>
      </Card>

      <p className="text-sm text-muted">
        SENTE SPEAK identifies denominations only. It does not verify whether a banknote is genuine.
      </p>
    </div>
  );
}
