import { Button } from "./Button";
import { Card } from "./Card";
import { StatusBanner } from "./StatusBanner";
import type { RecognizedResult, SpeechStatus } from "../types";

interface ResultCardProps {
  result: RecognizedResult;
  speechStatus: SpeechStatus;
  speechMessage: string;
  onReplay: () => void;
  onScanAnother: () => void;
  onHome: () => void;
}

export function ResultCard({
  result,
  speechStatus,
  speechMessage,
  onReplay,
  onScanAnother,
  onHome,
}: ResultCardProps) {
  const tone = speechStatus === "failed" || speechStatus === "unavailable" ? "warning" : "success";

  return (
    <div className="flex flex-col gap-5">
      <h2 id="page-heading" className="text-2xl font-extrabold sm:text-3xl">
        Banknote identified
      </h2>
      <Card tone="success" labelledBy="denomination-heading">
        <p className="text-base font-bold uppercase tracking-wide text-muted" id="denomination-heading">
          Detected denomination
        </p>
        <p className="mt-2 break-words text-5xl font-extrabold leading-tight text-ink sm:text-7xl">
          {result.denomination}
        </p>
        <p className="mt-4 text-xl sm:text-2xl">
          Detected denomination: {result.spoken_text}.
        </p>
        <div className="mt-5 rounded-xl border-2 border-accent bg-surface px-4 py-3">
          <p className="text-sm font-semibold text-muted">Visual denomination label</p>
          <p className="text-2xl font-extrabold text-accent">{result.denomination}</p>
        </div>
      </Card>

      <StatusBanner tone={tone} title={speechStatus === "speaking" ? "Speaking the result" : "Audio feedback"}>
        {speechMessage}
      </StatusBanner>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onReplay} icon="▷">
          Replay audio
        </Button>
        <Button variant="secondary" onClick={onScanAnother}>
          Scan another banknote
        </Button>
        <Button variant="secondary" onClick={onHome}>
          Return to home
        </Button>
      </div>

      <p className="text-sm text-muted">{result.disclaimer}</p>
    </div>
  );
}
