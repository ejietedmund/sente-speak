import { LANGUAGE_ORDER, languageConfig } from "../config/languages";
import type { LanguageCode } from "../types";

interface LanguageSelectProps {
  value: LanguageCode;
  onChange: (language: LanguageCode) => void;
  id?: string;
}

export function LanguageSelect({ value, onChange, id = "speech-language" }: LanguageSelectProps) {
  const config = languageConfig[value];
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-bold">
        Speech language
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as LanguageCode)}
        aria-describedby={config.notice ? `${id}-notice` : undefined}
        className="min-h-[3.5rem] w-full rounded-control border-2 border-line bg-surface px-4 py-2 text-base font-semibold text-ink"
      >
        {LANGUAGE_ORDER.map((code) => (
          <option key={code} value={code}>
            {languageConfig[code].label}
          </option>
        ))}
      </select>
      <p id={`${id}-notice`} className="text-sm text-muted">
        {config.verified
          ? "Verified speech translations are available for this language."
          : config.notice}
      </p>
    </div>
  );
}
