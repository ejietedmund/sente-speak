import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AccessibilityPreferences, LanguageCode, TextSize } from "../types";
import { LANGUAGE_ORDER } from "../config/languages";

const STORAGE_KEY = "sente-speak-accessibility-v1";

export const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  language: "en",
  speechEnabled: true,
  speechRepetition: 1,
  textSize: "normal",
  highContrast: false,
  reducedMotion: false,
};

function loadPreferences(): AccessibilityPreferences {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<AccessibilityPreferences>;
    const language: LanguageCode = LANGUAGE_ORDER.includes(parsed.language as LanguageCode)
      ? (parsed.language as LanguageCode)
      : DEFAULT_PREFERENCES.language;
    const textSize: TextSize = ["normal", "large", "xlarge"].includes(parsed.textSize as TextSize)
      ? (parsed.textSize as TextSize)
      : DEFAULT_PREFERENCES.textSize;
    const repetition =
      typeof parsed.speechRepetition === "number" && [1, 2, 3].includes(parsed.speechRepetition)
        ? parsed.speechRepetition
        : 1;
    return {
      language,
      textSize,
      speechRepetition: repetition,
      speechEnabled:
        typeof parsed.speechEnabled === "boolean"
          ? parsed.speechEnabled
          : DEFAULT_PREFERENCES.speechEnabled,
      highContrast: Boolean(parsed.highContrast),
      reducedMotion: Boolean(parsed.reducedMotion),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  setPreference: <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K],
  ) => void;
  resetPreferences: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(loadPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      void 0;
    }
    const root = document.documentElement;
    root.classList.toggle("high-contrast", preferences.highContrast);
    root.classList.toggle("text-large", preferences.textSize === "large");
    root.classList.toggle("text-xlarge", preferences.textSize === "xlarge");
    root.classList.toggle("reduce-motion", preferences.reducedMotion);
  }, [preferences]);

  const setPreference = useCallback(
    <K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) => {
      setPreferences((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const resetPreferences = useCallback(() => setPreferences(DEFAULT_PREFERENCES), []);

  const value = useMemo(
    () => ({ preferences, setPreference, resetPreferences }),
    [preferences, setPreference, resetPreferences],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error("useAccessibility must be used inside AccessibilityProvider");
  return context;
}
