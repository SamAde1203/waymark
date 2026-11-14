import type { PublicItem } from "@waymark/content-schema";

export const EXAM = {
  questions: 24,
  minutes: 45,
  passMark: 18, // 75% of 24
} as const;

/** An answer is correct only if the selected set equals the correct set exactly. */
export function isCorrect(item: Pick<PublicItem, "options">, selected: readonly string[]): boolean {
  const correct = item.options.filter((o) => o.is_correct).map((o) => o.id).sort();
  const chosen = [...new Set(selected)].sort();
  return correct.length === chosen.length && correct.every((id, i) => id === chosen[i]);
}

export interface AnsweredQuestion {
  item: Pick<PublicItem, "item_id" | "options" | "source">;
  selected: string[];
}

export interface ExamResult {
  score: number;
  total: number;
  passed: boolean;
  byChapter: Record<number, { correct: number; total: number }>;
  wrong: string[];
}

export function scoreExam(answers: readonly AnsweredQuestion[], passMark: number = EXAM.passMark): ExamResult {
  const byChapter: ExamResult["byChapter"] = {};
  const wrong: string[] = [];
  let score = 0;
  for (const a of answers) {
    const ch = a.item.source.chapter_id;
    const slot = (byChapter[ch] ??= { correct: 0, total: 0 });
    slot.total++;
    if (isCorrect(a.item, a.selected)) {
      score++;
      slot.correct++;
    } else {
      wrong.push(a.item.item_id);
    }
  }
  return { score, total: answers.length, passed: score >= passMark, byChapter, wrong };
}
