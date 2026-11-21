import type { PublicItem } from "@waymark/content-schema";
import {
  buildMock,
  dueFacts,
  isCorrect,
  isDatesNumbersItem,
  isSecured,
  pickDrillFacts,
  newFactCard,
  readiness,
  review,
  seededRandom,
  shuffle,
  type Readiness,
} from "@waymark/shared";
import {
  BANK,
  CHAPTER_WEIGHTS,
  FACT_CHAPTER,
  FACT_IDS,
  FREE_CHAPTERS,
  ITEMS_BY_FACT,
  ITEM_BY_ID,
  PREVIEW,
  type ChapterId,
} from "@/content/bank";
import { getState, setState, type AnswerRecord, type State } from "./store";

export function examDateOf(s: State): Date | null {
  return s.examDate ? new Date(`${s.examDate}T09:00:00`) : null;
}

export function daysToExam(s: State, now = new Date()): number | null {
  const d = examDateOf(s);
  if (!d) return null;
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

/** Which chapters the user may study. Free: chapters 1-2. */
export function canUseChapter(s: State, ch: number): boolean {
  return s.unlocked || FREE_CHAPTERS.includes(ch as ChapterId);
}

export function availableItems(s: State): PublicItem[] {
  return BANK.filter((i) => canUseChapter(s, i.source.chapter_id));
}

/** Record an answer: log it, update the fact's schedule, and track mistakes. */
export function recordAnswer(item: PublicItem, selected: string[], mode: AnswerRecord["mode"]): boolean {
  const correct = isCorrect(item, selected);
  const now = new Date();
  setState((s) => {
    const seenBefore = s.log.some((r) => r.itemId === item.item_id);
    const card = s.cards[item.fact_id] ?? newFactCard(now);
    const next = review(card, correct, examDateOf(s), now);
    const mistakes = correct
      ? s.mistakes.filter((id) => id !== item.item_id)
      : s.mistakes.includes(item.item_id)
        ? s.mistakes
        : [...s.mistakes, item.item_id];
    return {
      ...s,
      cards: { ...s.cards, [item.fact_id]: next },
      mistakes,
      log: [
        ...s.log,
        {
          itemId: item.item_id,
          factId: item.fact_id,
          chapter: item.source.chapter_id,
          correct,
          firstAttempt: !seenBefore,
          mode,
          at: now.toISOString(),
        },
      ],
    };
  });
  return correct;
}

/** Pick a question for a fact, preferring a variant the user has not seen recently. */
function itemForFact(s: State, factId: string, rand: () => number): PublicItem | null {
  const variants = ITEMS_BY_FACT[factId];
  if (!variants?.length) return null;
  const recent = new Set(s.log.slice(-200).map((r) => r.itemId));
  const fresh = variants.filter((v) => !recent.has(v.item_id));
  const pool = fresh.length ? fresh : variants;
  return pool[Math.floor(rand() * pool.length)] ?? null;
}

/** About 40 seconds a question. */
export function questionsForMinutes(min: number): number {
  return Math.max(10, Math.round(min * 1.5));
}

export interface DailyPlan {
  due: string[]; // fact ids due for review
  fresh: string[]; // new facts to learn today
  total: number;
}

export function dailyPlan(s: State, now = new Date()): DailyPlan {
  const budget = questionsForMinutes(s.minutesPerDay);
  const usable = new Set(FACT_IDS.filter((f) => canUseChapter(s, FACT_CHAPTER[f]!)));
  const due = dueFacts(s.cards, now).filter((f) => usable.has(f)).slice(0, budget);
  const unseen = FACT_IDS.filter((f) => usable.has(f) && !s.cards[f]);
  // Learn new facts in chapter order, so sessions follow the handbook.
  unseen.sort((a, b) => FACT_CHAPTER[a]! - FACT_CHAPTER[b]!);
  // With a test date, pace new facts so everything is seen at least 5 days before the test.
  const days = daysToExam(s, now);
  let newQuota = budget - due.length;
  if (days !== null && days > 5) newQuota = Math.max(newQuota, Math.ceil(unseen.length / (days - 5)));
  const fresh = unseen.slice(0, Math.max(0, Math.min(newQuota, budget)));
  return { due, fresh, total: due.length + fresh.length };
}

export function sessionItems(s: State, factIds: string[], seed = Date.now()): PublicItem[] {
  const rand = seededRandom(seed);
  return factIds.map((f) => itemForFact(s, f, rand)).filter((x): x is PublicItem => !!x);
}

export function sectionItems(s: State, chapter: number, section: string): PublicItem[] {
  const facts = [...new Set(BANK.filter((i) => i.source.chapter_id === chapter && i.source.section === section).map((i) => i.fact_id))];
  return shuffle(sessionItems(s, facts), seededRandom(Date.now()));
}

export function chapterItems(s: State, chapter: number, n = 20): PublicItem[] {
  const facts = [...new Set(BANK.filter((i) => i.source.chapter_id === chapter).map((i) => i.fact_id))];
  return sessionItems(s, shuffle(facts, seededRandom(Date.now())).slice(0, n));
}

export function newMock(s: State, seed = Date.now()): PublicItem[] {
  const recent = new Set(s.mocks.slice(-3).flatMap((m) => m.itemIds));
  const statuses: PublicItem["status"][] = PREVIEW ? ["live", "reviewed", "draft"] : ["live"];
  return buildMock(BANK, { seed, avoid: recent, statuses });
}

/** Mastery per chapter from first-attempt answers, plus readiness. */
export function readinessOf(s: State): Readiness {
  const evidence: Record<number, { attempts: number; correct: number }> = {};
  for (const r of s.log) {
    if (!r.firstAttempt) continue;
    const e = (evidence[r.chapter] ??= { attempts: 0, correct: 0 });
    e.attempts++;
    if (r.correct) e.correct++;
  }
  const distinct = new Set(s.log.map((r) => r.itemId)).size;
  return readiness(evidence, CHAPTER_WEIGHTS, distinct, s.mocks.length);
}

export function chapterMastery(s: State, ch: number): { seen: number; total: number; secured: number } {
  const facts = FACT_IDS.filter((f) => FACT_CHAPTER[f] === ch);
  const now = Date.now();
  let seen = 0;
  let secured = 0;
  for (const f of facts) {
    const c = s.cards[f];
    if (!c) continue;
    seen++;
    // "Secured": answered right at least twice and not due for a day or more.
    if (c.reps >= 2 && c.lapses === 0 && new Date(c.due).getTime() - now > 86_400_000) secured++;
  }
  return { seen, total: facts.length, secured };
}

export function sectionAccuracy(s: State): { chapter: number; section: string; accuracy: number; n: number }[] {
  const by: Record<string, { chapter: number; section: string; c: number; n: number }> = {};
  const sectionOf = Object.fromEntries(BANK.map((i) => [i.item_id, i.source.section]));
  for (const r of s.log) {
    const section = sectionOf[r.itemId];
    if (!section) continue;
    const key = `${r.chapter}|${section}`;
    const e = (by[key] ??= { chapter: r.chapter, section, c: 0, n: 0 });
    e.n++;
    if (r.correct) e.c++;
  }
  return Object.values(by)
    .filter((e) => e.n >= 3)
    .map((e) => ({ chapter: e.chapter, section: e.section, accuracy: e.c / e.n, n: e.n }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/** Questions for the Dates & numbers drill, grouped by fact. */
const DRILL_BY_FACT: Record<string, PublicItem[]> = {};
for (const it of BANK) if (isDatesNumbersItem(it)) (DRILL_BY_FACT[it.fact_id] ??= []).push(it);
export const DRILL_FACTS = Object.keys(DRILL_BY_FACT);
export const DRILL_ROUND = 15;

/**
 * Free users get one round from every chapter, like the free mock, so they can see
 * how it works. Paid users drill without limit.
 */
export function freeDrillUsed(s: State): boolean {
  return !s.unlocked && s.drills >= 1;
}

function drillFactsFor(s: State): string[] {
  return s.unlocked || s.drills < 1 ? DRILL_FACTS : DRILL_FACTS.filter((f) => canUseChapter(s, FACT_CHAPTER[f]!));
}

export function drillItems(s: State, n = DRILL_ROUND, seed = Date.now()): PublicItem[] {
  const rand = seededRandom(seed);
  const mistakeFacts = new Set(s.mistakes.map((id) => ITEM_BY_ID[id]?.fact_id).filter((f): f is string => !!f));
  const facts = pickDrillFacts({ facts: drillFactsFor(s), cards: s.cards, mistakeFacts, now: new Date(), n, rand });
  const recent = new Set(s.log.slice(-200).map((r) => r.itemId));
  return facts
    .map((f) => {
      const variants = DRILL_BY_FACT[f]!;
      const fresh = variants.filter((v) => !recent.has(v.item_id));
      const pool = fresh.length ? fresh : variants;
      return pool[Math.floor(rand() * pool.length)];
    })
    .filter((x): x is PublicItem => !!x);
}

/** How many of the drill's dates and numbers are secured. */
export function drillProgress(s: State, now = new Date()): { secured: number; total: number } {
  return { secured: DRILL_FACTS.filter((f) => isSecured(s.cards[f], now)).length, total: DRILL_FACTS.length };
}

export function freeMockUsed(s: State): boolean {
  return !s.unlocked && s.mocks.length >= 1;
}

export { getState };
