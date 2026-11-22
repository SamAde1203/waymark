import ar from "../../../../content/translations/ar.json";
import pl from "../../../../content/translations/pl.json";
import ro from "../../../../content/translations/ro.json";
import ur from "../../../../content/translations/ur.json";
import zh from "../../../../content/translations/zh.json";

/**
 * Explanations in the user's own language. The questions stay in English, like the
 * real test. Translations are keyed by the exact English explanation, so an edited
 * explanation never shows an out-of-date translation.
 */
export type ExplainLang = "off" | "pl" | "zh" | "ur" | "ar" | "ro";
type Lang = Exclude<ExplainLang, "off">;

export const LANGS: { id: Lang; name: string; tag: string; rtl: boolean; note: string }[] = [
  { id: "pl", name: "Polski", tag: "pl", rtl: false, note: "Tłumaczenie AI. Oficjalna jest wersja angielska." },
  { id: "zh", name: "中文（简体）", tag: "zh-Hans", rtl: false, note: "AI 翻译。以英文原文为准。" },
  { id: "ur", name: "اردو", tag: "ur", rtl: true, note: "AI ترجمہ۔ انگریزی متن ہی مستند ہے۔" },
  { id: "ar", name: "العربية", tag: "ar", rtl: true, note: "ترجمة بالذكاء الاصطناعي. النص الإنجليزي هو المعتمد." },
  { id: "ro", name: "Română", tag: "ro", rtl: false, note: "Traducere AI. Versiunea oficială este cea în engleză." },
];

export const LANG_IDS = LANGS.map((l) => l.id);

const TABLES: Record<Lang, Record<string, string>> = { pl, zh, ur, ar, ro };

export function translateExplanation(english: string, lang: ExplainLang): string | null {
  if (lang === "off") return null;
  return TABLES[lang]?.[english] ?? null;
}
