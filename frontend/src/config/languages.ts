import type { DenominationKey, LanguageCode } from "../types";

export interface LanguageConfig {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  bcp47: string;
  verified: boolean;
  notice: string;
  speechFallback: LanguageCode | null;
}

export interface ResolvedSpeech {
  text: string;
  spokenLanguage: LanguageCode;
  verified: boolean;
  notice: string;
}

export const LANGUAGE_ORDER: readonly LanguageCode[] = ["en", "lg", "teo"];

export const languageConfig: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: "en",
    label: "English",
    nativeLabel: "English",
    bcp47: "en-UG",
    verified: true,
    notice: "",
    speechFallback: null,
  },
  lg: {
    code: "lg",
    label: "Luganda",
    nativeLabel: "Luganda",
    bcp47: "lg-UG",
    verified: false,
    notice:
      "Verified Luganda speech translations are not yet available. English audio will be used until they are supplied.",
    speechFallback: "en",
  },
  teo: {
    code: "teo",
    label: "Ateso",
    nativeLabel: "Ateso",
    bcp47: "teo-UG",
    verified: false,
    notice:
      "Verified Ateso speech translations are not yet available. English audio will be used until they are supplied.",
    speechFallback: "en",
  },
};

export const denominationSpeech: Record<LanguageCode, Record<DenominationKey, string | null>> = {
  en: {
    "1000": "One thousand Ugandan Shillings",
    "2000": "Two thousand Ugandan Shillings",
    "5000": "Five thousand Ugandan Shillings",
    "10000": "Ten thousand Ugandan Shillings",
    "20000": "Twenty thousand Ugandan Shillings",
    "50000": "Fifty thousand Ugandan Shillings",
  },
  lg: {
    "1000": null,
    "2000": null,
    "5000": null,
    "10000": null,
    "20000": null,
    "50000": null,
  },
  teo: {
    "1000": null,
    "2000": null,
    "5000": null,
    "10000": null,
    "20000": null,
    "50000": null,
  },
};

export function resolveDenominationSpeech(
  language: LanguageCode,
  key: DenominationKey,
): ResolvedSpeech {
  const translated = denominationSpeech[language][key];
  if (translated) {
    return { text: translated, spokenLanguage: language, verified: true, notice: "" };
  }

  const config = languageConfig[language];
  const fallback = config.speechFallback;
  return {
    text: fallback ? denominationSpeech[fallback][key] ?? "" : "",
    spokenLanguage: fallback ?? "en",
    verified: false,
    notice: config.notice,
  };
}
