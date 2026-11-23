import { useCallback, useEffect, useRef, useState } from "react";
import type { LanguageCode, SpeechOutcome, SpeechStatus } from "../types";
import { languageConfig } from "../config/languages";

interface SpeakOptions {
  text: string;
  language: LanguageCode;
  repetitions: number;
  enabled: boolean;
}

const synth =
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

function voiceFor(language: LanguageCode): { voice: SpeechSynthesisVoice | null; fallback: boolean } {
  if (!synth) return { voice: null, fallback: true };
  const voices = synth.getVoices();
  const target = languageConfig[language].bcp47.toLowerCase();
  const prefix = target.split("-")[0];
  const normalised = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().replace("_", "-");

  const exact = voices.find((voice) => normalised(voice) === target);
  if (exact) return { voice: exact, fallback: false };

  const sameLanguage = voices.find((voice) => normalised(voice).split("-")[0] === prefix);
  if (sameLanguage) return { voice: sameLanguage, fallback: false };

  const english = voices.find((voice) => normalised(voice).startsWith("en"));
  return { voice: english ?? voices[0] ?? null, fallback: true };
}

function outcome(
  played: boolean,
  status: SpeechStatus,
  language: LanguageCode,
  message: string,
): SpeechOutcome {
  return { played, status, language, message };
}

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>(synth ? "idle" : "unavailable");
  const [lastOutcome, setLastOutcome] = useState<SpeechOutcome | null>(null);
  const timer = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    synth?.cancel();
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!synth) {
      setStatus("unavailable");
      return;
    }
    const update = () => voiceFor("en");
    update();
    synth.addEventListener?.("voiceschanged", update);
    return () => {
      synth.removeEventListener?.("voiceschanged", update);
      if (timer.current !== null) window.clearTimeout(timer.current);
      synth.cancel();
    };
  }, []);

  const speak = useCallback(
    ({ text, language, repetitions, enabled }: SpeakOptions): Promise<SpeechOutcome> => {
      cancel();
      if (!enabled) {
        const result = outcome(false, "disabled", language, "Speech playback is turned off.");
        setStatus("disabled");
        setLastOutcome(result);
        return Promise.resolve(result);
      }
      if (!synth || typeof window.SpeechSynthesisUtterance === "undefined") {
        const result = outcome(
          false,
          "unavailable",
          language,
          "Speech is not available in this browser. The result is still shown on screen.",
        );
        setStatus("unavailable");
        setLastOutcome(result);
        return Promise.resolve(result);
      }
      if (!text.trim()) {
        const result = outcome(false, "failed", language, "There is no text to speak.");
        setStatus("failed");
        setLastOutcome(result);
        return Promise.resolve(result);
      }

      const { voice, fallback } = voiceFor(language);
      const config = languageConfig[language];
      const count = Math.max(1, Math.min(3, repetitions || 1));
      let remaining = count;
      let completed = false;

      return new Promise<SpeechOutcome>((resolve) => {
        const success = outcome(
          true,
          fallback ? "no-voice" : "idle",
          language,
          fallback
            ? `No voice was found for ${config.label}. English speech was used instead.`
            : `Speech completed in ${config.label}.`,
        );

        const runOnce = () => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = voice?.lang ?? config.bcp47;
          if (voice) utterance.voice = voice;
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 1;

          utterance.onend = () => {
            completed = true;
            remaining -= 1;
            if (remaining > 0) {
              timer.current = window.setTimeout(() => runOnce(), 350);
            } else {
              setLastOutcome(success);
              setStatus(success.status);
              resolve(success);
            }
          };

          utterance.onerror = () => {
            if (completed) return;
            const failed = outcome(
              false,
              "failed",
              language,
              "Speech playback failed. Use the replay button or read the result on screen.",
            );
            setLastOutcome(failed);
            setStatus("failed");
            resolve(failed);
          };

          try {
            synth.speak(utterance);
          } catch {
            const failed = outcome(
              false,
              "failed",
              language,
              "Speech playback failed. Use the replay button or read the result on screen.",
            );
            setLastOutcome(failed);
            setStatus("failed");
            resolve(failed);
          }
        };

        setStatus("speaking");
        runOnce();
      });
    },
    [cancel],
  );

  return { status, lastOutcome, speak, cancel };
}
