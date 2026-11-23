import { describe, expect, it } from "vitest";
import { denominationByKey, DENOMINATIONS } from "../config/denominations";
import { denominationSpeech, languageConfig, resolveDenominationSpeech } from "../config/languages";
import type { DenominationKey } from "../types";

const keys: DenominationKey[] = ["1000", "2000", "5000", "10000", "20000", "50000"];

describe("language configuration", () => {
  it("keeps the six denominations in trained class order", () => {
    expect(DENOMINATIONS.map((item) => item.key)).toEqual(keys);
    expect(denominationByKey("10000").label).toBe("UGX 10,000");
  });

  it("provides verified English speech for every denomination", () => {
    keys.forEach((key) => {
      const resolved = resolveDenominationSpeech("en", key);
      expect(resolved.verified).toBe(true);
      expect(resolved.text).toBe(denominationSpeech.en[key]);
      expect(resolved.spokenLanguage).toBe("en");
    });
    expect(resolveDenominationSpeech("en", "10000").text).toBe("Ten thousand Ugandan Shillings");
  });

  it("uses explicit placeholders for Luganda and Ateso", () => {
    (["lg", "teo"] as const).forEach((language) => {
      expect(languageConfig[language].verified).toBe(false);
      keys.forEach((key) => {
        expect(denominationSpeech[language][key]).toBeNull();
        const resolved = resolveDenominationSpeech(language, key);
        expect(resolved.verified).toBe(false);
        expect(resolved.spokenLanguage).toBe("en");
        expect(resolved.text).toBe(denominationSpeech.en[key]);
        expect(resolved.notice).toMatch(/not yet available/i);
      });
    });
  });
});
