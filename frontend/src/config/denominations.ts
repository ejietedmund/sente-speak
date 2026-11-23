import type { DenominationKey } from "../types";

export interface Denomination {
  key: DenominationKey;
  label: string;
  englishWords: string;
}

export const DENOMINATIONS: readonly Denomination[] = [
  { key: "1000", label: "UGX 1,000", englishWords: "One thousand Ugandan Shillings" },
  { key: "2000", label: "UGX 2,000", englishWords: "Two thousand Ugandan Shillings" },
  { key: "5000", label: "UGX 5,000", englishWords: "Five thousand Ugandan Shillings" },
  { key: "10000", label: "UGX 10,000", englishWords: "Ten thousand Ugandan Shillings" },
  { key: "20000", label: "UGX 20,000", englishWords: "Twenty thousand Ugandan Shillings" },
  { key: "50000", label: "UGX 50,000", englishWords: "Fifty thousand Ugandan Shillings" },
];

export function denominationByKey(key: DenominationKey): Denomination {
  return DENOMINATIONS.find((item) => item.key === key) ?? DENOMINATIONS[0];
}
