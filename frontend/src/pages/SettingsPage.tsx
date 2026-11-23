import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { LanguageSelect } from "../components/LanguageSelect";
import { StatusBanner } from "../components/StatusBanner";
import type { AccessibilityPreferences, LanguageCode, TextSize } from "../types";

interface SettingsPageProps {
  preferences: AccessibilityPreferences;
  onPreferenceChange: <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K],
  ) => void;
  onReset: () => void;
  onTestSpeech: () => void;
  speechMessage: string;
  onHome: () => void;
}

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-xl border-2 border-line bg-paper p-4">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-7 w-7 shrink-0 accent-primary"
        />
        <div>
          <label htmlFor={id} className="text-lg font-bold">
            {label}
          </label>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage({
  preferences,
  onPreferenceChange,
  onReset,
  onTestSpeech,
  speechMessage,
  onHome,
}: SettingsPageProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 id="page-heading" className="text-3xl font-extrabold sm:text-4xl">
          Settings and accessibility
        </h1>
        <p className="mt-2 text-lg">Changes are saved automatically on this device.</p>
      </div>

      <Card labelledBy="speech-settings-heading">
        <h2 id="speech-settings-heading" className="text-xl font-bold">
          Speech
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          <LanguageSelect
            id="settings-language"
            value={preferences.language}
            onChange={(value: LanguageCode) => onPreferenceChange("language", value)}
          />
          <Toggle
            id="speech-enabled"
            label="Speak results aloud"
            description="Announce recognized denominations and important errors."
            checked={preferences.speechEnabled}
            onChange={(value) => onPreferenceChange("speechEnabled", value)}
          />
          <div className="rounded-xl border-2 border-line bg-paper p-4">
            <label htmlFor="speech-repetition" className="text-lg font-bold">
              Speech repetition
            </label>
            <p className="mb-2 text-sm text-muted">How many times to repeat each announcement.</p>
            <select
              id="speech-repetition"
              value={preferences.speechRepetition}
              onChange={(event) => onPreferenceChange("speechRepetition", Number(event.target.value))}
              className="min-h-[3.5rem] w-full rounded-control border-2 border-line bg-surface px-4 text-base font-semibold"
            >
              <option value={1}>Once</option>
              <option value={2}>Twice</option>
              <option value={3}>Three times</option>
            </select>
          </div>
          <Button variant="secondary" onClick={onTestSpeech}>
            Test speech
          </Button>
          {speechMessage && (
            <StatusBanner tone="info" title="Speech status">
              {speechMessage}
            </StatusBanner>
          )}
        </div>
      </Card>

      <Card labelledBy="visual-settings-heading">
        <h2 id="visual-settings-heading" className="text-xl font-bold">
          Display
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-xl border-2 border-line bg-paper p-4">
            <label htmlFor="text-size" className="text-lg font-bold">
              Text size
            </label>
            <select
              id="text-size"
              value={preferences.textSize}
              onChange={(event) => onPreferenceChange("textSize", event.target.value as TextSize)}
              className="mt-2 min-h-[3.5rem] w-full rounded-control border-2 border-line bg-surface px-4 text-base font-semibold"
            >
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="xlarge">Extra large</option>
            </select>
          </div>
          <Toggle
            id="high-contrast"
            label="High contrast"
            description="Use solid black, white and strong outlines."
            checked={preferences.highContrast}
            onChange={(value) => onPreferenceChange("highContrast", value)}
          />
          <Toggle
            id="reduced-motion"
            label="Reduced motion"
            description="Minimize animations and transitions."
            checked={preferences.reducedMotion}
            onChange={(value) => onPreferenceChange("reducedMotion", value)}
          />
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onHome}>Done — return home</Button>
        <Button variant="secondary" onClick={onReset}>
          Reset settings
        </Button>
      </div>
    </div>
  );
}
