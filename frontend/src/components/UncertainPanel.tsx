import { Button } from "./Button";
import { Card } from "./Card";
import { StatusBanner } from "./StatusBanner";
import type { UncertainResult } from "../types";

interface UncertainPanelProps {
  result: UncertainResult;
  onTryAgain: () => void;
  onCaptureAnother: () => void;
  onHome: () => void;
}

export function UncertainPanel({ result, onTryAgain, onCaptureAnother, onHome }: UncertainPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 id="page-heading" className="text-2xl font-extrabold sm:text-3xl">
        Banknote not identified
      </h2>
      <StatusBanner tone="warning" title="I'm not sure about this banknote">
        {result.message}
      </StatusBanner>
      <Card tone="warning" labelledBy="uncertain-heading">
        <p id="uncertain-heading" className="text-lg font-bold">
          No denomination was selected.
        </p>
        <p className="mt-2">
          The recognition system rejected this image. It will not guess a value when the result is
          uncertain.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          <li>Make sure the whole banknote is visible.</li>
          <li>Move to even light and avoid glare.</li>
          <li>Hold the camera or device steady.</li>
        </ul>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onTryAgain}>Try again with this image</Button>
        <Button variant="secondary" onClick={onCaptureAnother}>
          Capture another image
        </Button>
        <Button variant="secondary" onClick={onHome}>
          Return to main screen
        </Button>
      </div>
      <p className="text-sm text-muted">{result.disclaimer}</p>
    </div>
  );
}
