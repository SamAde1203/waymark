import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";

/**
 * Spaced repetition at FACT level using FSRS (ts-fsrs, MIT).
 *
 * Exam-date policy: there is no point scheduling a review after the test, so the
 * maximum interval is capped at the days remaining, and the retention target rises
 * as the test approaches (0.90 normally, up to 0.95 in the final week).
 */
export type FactCard = Card;

export function newFactCard(now: Date = new Date()): FactCard {
  return createEmptyCard(now);
}

export function daysUntil(examDate: Date | null, now: Date): number | null {
  if (!examDate) return null;
  return Math.ceil((examDate.getTime() - now.getTime()) / 86_400_000);
}

export function schedulerFor(examDate: Date | null, now: Date = new Date()) {
  const days = daysUntil(examDate, now);
  const maximum_interval = days === null ? 60 : Math.max(1, days - 1);
  const request_retention = days !== null && days <= 7 ? 0.95 : 0.9;
  return fsrs({ maximum_interval, request_retention, enable_fuzz: false });
}

/** First-attempt correct → Good, wrong → Again. Fast and sure answers could later map to Easy. */
export function gradeFor(correct: boolean): Grade {
  return correct ? Rating.Good : Rating.Again;
}

export function review(card: FactCard, correct: boolean, examDate: Date | null, now: Date = new Date()): FactCard {
  const next = schedulerFor(examDate, now).next(card, now, gradeFor(correct)).card;
  if (examDate) {
    // Never due after the test: pull it back to the day before (or now, if that has passed).
    const latest = Math.max(now.getTime(), examDate.getTime() - 86_400_000);
    if (new Date(next.due).getTime() > latest) return { ...next, due: new Date(latest) };
  }
  return next;
}

/** Facts due now, most overdue first. */
export function dueFacts(cards: Record<string, FactCard>, now: Date = new Date()): string[] {
  return Object.entries(cards)
    .filter(([, c]) => new Date(c.due).getTime() <= now.getTime())
    .sort(([, a], [, b]) => new Date(a.due).getTime() - new Date(b.due).getTime())
    .map(([id]) => id);
}
