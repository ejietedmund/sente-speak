export type DenominationKey = "1000" | "2000" | "5000" | "10000" | "20000" | "50000";

export type LanguageCode = "en" | "lg" | "teo";

export type TextSize = "normal" | "large" | "xlarge";

export type SpeechStatus = "idle" | "speaking" | "unavailable" | "failed" | "no-voice" | "disabled";

export interface AccessibilityPreferences {
  language: LanguageCode;
  speechEnabled: boolean;
  speechRepetition: number;
  textSize: TextSize;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface SpeechOutcome {
  played: boolean;
  status: SpeechStatus;
  language: LanguageCode;
  message: string;
}

export interface ClassPrediction {
  index: number;
  label: string;
  key: string;
  confidence: number;
}

export interface ModelInfo {
  available: boolean;
  architecture: string;
  input_size: number;
  class_count: number;
  model_file: string;
  source: string;
  color_order: string;
  preprocessing: string;
  reason?: string;
  hint?: string;
}

export interface PolicyInfo {
  min_confidence: number;
  min_margin: number;
  description: string;
}

export interface RecognizedResult {
  status: "recognized";
  denomination: string;
  denomination_key: DenominationKey;
  spoken_text: string;
  class_index: number;
  confidence: number;
  margin: number;
  alternatives: ClassPrediction[];
  model: ModelInfo;
  processing_ms: number;
  disclaimer: string;
}

export interface UncertainResult {
  status: "uncertain";
  message: string;
  reason: string;
  confidence: number;
  margin: number;
  top: ClassPrediction | null;
  alternatives: ClassPrediction[];
  model: ModelInfo;
  processing_ms: number;
  disclaimer: string;
}

export type RecognitionResult = RecognizedResult | UncertainResult;

export interface HealthResponse {
  status: "ok" | "model_unavailable";
  version: string;
  model: ModelInfo;
  policy: PolicyInfo;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  hint: string;
  retryable: boolean;
}

export type View = "home" | "camera" | "upload" | "result" | "uncertain" | "settings" | "about";

export type ScanMode = "camera" | "upload";
