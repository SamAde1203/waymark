import { EXAM } from "./scoring.ts";

/** P(score >= passMark) when each of n questions is answered correctly with probability p. */
export function passProbability(p: number, n: number = EXAM.questions, passMark: number = EXAM.passMark): number {
  const q = Math.min(1, Math.max(0, p));
  let total = 0;
  for (let k = passMark; k <= n; k++) total += binom(n, k) * q ** k * (1 - q) ** (n - k);
  return total;
}

function binom(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

export interface ChapterEvidence {
  /** First-attempt answers on items not seen in the last 7 days. */
  attempts: number;
  correct: number;
}

export type ReadinessBand = "provisional" | "not_yet" | "borderline" | "likely";

export interface Readiness {
  band: ReadinessBand;
  /** Estimated per-question accuracy across the blueprint (0-1). */
  accuracy: number;
  /** Estimated chance of scoring 18+ (0-1). Shown as a band, never as a promise. */
  passChance: number;
  distinctItems: number;
  mocks: number;
}

export const EVIDENCE_MIN = { distinctItems: 150, mocks: 2 } as const;

/**
 * Readiness = blueprint-weighted mastery, smoothed with a Beta(1,1) prior per chapter
 * so thin evidence cannot look like mastery, then turned into a pass chance.
 * Bands: likely >= 0.9, borderline >= 0.6, else not yet. Below the evidence minimum
 * the band is "provisional" regardless of the numbers.
 */
export function readiness(
  evidence: Record<number, ChapterEvidence>,
  weights: Record<number, number>,
  distinctItems: number,
  mocks: number,
): Readiness {
  const chapters = Object.keys(weights).map(Number);
  const wSum = chapters.reduce((s, c) => s + (weights[c] ?? 0), 0) || 1;
  const accuracy = chapters.reduce((s, c) => {
    const e = evidence[c] ?? { attempts: 0, correct: 0 };
    const mastery = (e.correct + 1) / (e.attempts + 2);
    return s + ((weights[c] ?? 0) / wSum) * mastery;
  }, 0);
  const passChance = passProbability(accuracy);
  let band: ReadinessBand;
  if (distinctItems < EVIDENCE_MIN.distinctItems || mocks < EVIDENCE_MIN.mocks) band = "provisional";
  else if (passChance >= 0.9) band = "likely";
  else if (passChance >= 0.6) band = "borderline";
  else band = "not_yet";
  return { band, accuracy, passChance, distinctItems, mocks };
}

export const BAND_LABEL: Record<ReadinessBand, string> = {
  provisional: "Keep practising – not enough evidence yet",
  not_yet: "Not yet",
  borderline: "Borderline",
  likely: "Likely to pass",
};
