import type { PublicItem } from "@waymark/content-schema";
import type { FactCard } from "./srs.ts";

/**
 * "Dates & numbers" drill: the years, ages, counts and other numbers that people
 * find hardest to remember for the test.
 *
 * An item belongs to the drill when the thing being tested is a date or number:
 * the correct answer contains a number or a century, the question asks "when" or
 * "how many", or a true/false statement turns on a number. A year that is only
 * context ("What was the Glorious Revolution of 1688?") does not count.
 */
const ASKS_FOR_NUMBER =
  /^(how many|about how many|roughly how many|in which year|in what year|what year|when |how old|at what age|what age|what is the minimum age|from what age|how long|in which century|in which decade)/i;
const TF_PREFIX = /^Is the following statement TRUE or FALSE\? /i;

export function isDatesNumbersItem(item: PublicItem): boolean {
  const answer = item.options
    .filter((o) => o.is_correct)
    .map((o) => o.text)
    .join(" ");
  const question = item.question_text.replace(TF_PREFIX, "");
  if (/\d/.test(answer) || /\bcentur(y|ies)\b/i.test(answer)) return true;
  if (ASKS_FOR_NUMBER.test(question)) return true;
  return item.question_type === "true_false" && /\d/.test(question);
}

export interface DrillPickInput {
  /** Candidate fact ids (already limited to what the user may study). */
  facts: string[];
  cards: Record<string, FactCard>;
  /** Facts with a question the user got wrong and has not yet got right since. */
  mistakeFacts: Set<string>;
  now: Date;
  n: number;
  /** Tie-breaker in [0, 1); pass a seeded random for repeatable picks. */
  rand: () => number;
}

/**
 * Order: open mistakes first, then facts due for review (most overdue first),
 * then facts never seen, then the rest, weakest (soonest due) first.
 * Within each group, ties are shuffled so rounds don't repeat.
 */
export function pickDrillFacts({ facts, cards, mistakeFacts, now, n, rand }: DrillPickInput): string[] {
  const t = now.getTime();
  const rank = (f: string): [number, number] => {
    const c = cards[f];
    const due = c ? new Date(c.due).getTime() : Number.POSITIVE_INFINITY;
    if (mistakeFacts.has(f)) return [0, due];
    if (!c) return [2, 0];
    if (due <= t) return [1, due];
    return [3, due];
  };
  const keyed = facts.map((f) => ({ f, r: rank(f), tie: rand() }));
  keyed.sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.tie - b.tie);
  return keyed.slice(0, Math.max(0, n)).map((k) => k.f);
}

/** A fact counts as secured once answered right twice with no lapses and not due for a day. */
export function isSecured(card: FactCard | undefined, now: Date): boolean {
  if (!card) return false;
  return card.reps >= 2 && card.lapses === 0 && new Date(card.due).getTime() - now.getTime() > 86_400_000;
}
