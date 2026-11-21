import pl from "../../../../content/translations/pl.json";
import zh from "../../../../content/translations/zh.json";

/**
 * Explanations in the user's own language. The questions stay in English, like the
 * real test. Translations are keyed by the exact English explanation, so an edited
 * explanation never shows an out-of-date translation.
 */
export type ExplainLang = "off" | "pl" | "zh";

export const LANGS: { id: Exclude<ExplainLang, "off">; name: string; note: string }[] = [
  { id: "pl", name: "Polski", note: "Tłumaczenie AI. Oficjalna jest wersja angielska." },
  { id: "zh", name: "中文（简体）", note: "AI 翻译。以英文原文为准。" },
];

const TABLES: Record<Exclude<ExplainLang, "off">, Record<string, string>> = { pl, zh };

export function translateExplanation(english: string, lang: ExplainLang): string | null {
  if (lang === "off") return null;
  return TABLES[lang][english] ?? null;
}
