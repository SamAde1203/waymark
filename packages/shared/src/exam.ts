import type { PublicItem } from "@waymark/content-schema";
import { EXAM } from "./scoring.ts";
import { seededRandom, shuffle } from "./random.ts";

/**
 * Chapter weights for the mock blueprint. The official chapter mix is NOT published;
 * these are Waymark's own defaults and live in remote config so they can change.
 * Default: proportional to the number of distinct facts per chapter, with at least
 * one question from each chapter.
 */
export type Blueprint = Partial<Record<1 | 2 | 3 | 4 | 5, number>>;

export function blueprintFromBank(items: readonly Pick<PublicItem, "fact_id" | "source">[]): Blueprint {
  const facts: Record<number, Set<string>> = {};
  for (const it of items) (facts[it.source.chapter_id] ??= new Set()).add(it.fact_id);
  const bp: Blueprint = {};
  for (const [ch, set] of Object.entries(facts)) bp[Number(ch) as 1] = set.size;
  return bp;
}

/** Largest-remainder apportionment of `total` seats across weights, min 1 each where possible. */
export function apportion(weights: Blueprint, total: number): Record<number, number> {
  const entries = Object.entries(weights)
    .map(([k, w]) => [Number(k), w ?? 0] as const)
    .filter(([, w]) => w > 0);
  const out: Record<number, number> = {};
  if (entries.length === 0) return out;
  const floorEach = entries.length <= total ? 1 : 0;
  let remaining = total - floorEach * entries.length;
  const sum = entries.reduce((s, [, w]) => s + w, 0);
  const raw = entries.map(([k, w]) => ({ k, exact: (w / sum) * remaining }));
  for (const r of raw) out[r.k] = floorEach + Math.floor(r.exact);
  remaining -= raw.reduce((s, r) => s + Math.floor(r.exact), 0);
  raw
    .sort((a, b) => (b.exact % 1) - (a.exact % 1) || a.k - b.k)
    .slice(0, remaining)
    .forEach((r) => (out[r.k] = (out[r.k] ?? 0) + 1));
  return out;
}

export interface MockOptions {
  seed: number;
  blueprint?: Blueprint;
  /** item_ids to avoid if possible (e.g. seen in the last mocks). */
  avoid?: ReadonlySet<string>;
  size?: number;
}

/**
 * Build a mock exam: chapter quotas from the blueprint, at most one item per fact,
 * avoided items used only when a chapter would otherwise run short.
 * Option order is shuffled per question too.
 */
export function buildMock<T extends PublicItem>(bank: readonly T[], opts: MockOptions): T[] {
  const size = opts.size ?? EXAM.questions;
  const rand = seededRandom(opts.seed);
  const live = bank.filter((i) => i.status === "live" || i.status === "reviewed");
  const quotas = apportion(opts.blueprint ?? blueprintFromBank(live), size);
  const avoid = opts.avoid ?? new Set<string>();
  const usedFacts = new Set<string>();
  const picked: T[] = [];

  for (const [chStr, quota] of Object.entries(quotas)) {
    const ch = Number(chStr);
    const pool = shuffle(
      live.filter((i) => i.source.chapter_id === ch),
      rand,
    ).sort((a, b) => Number(avoid.has(a.item_id)) - Number(avoid.has(b.item_id)));
    let n = 0;
    for (const it of pool) {
      if (n >= quota) break;
      if (usedFacts.has(it.fact_id)) continue;
      usedFacts.add(it.fact_id);
      picked.push(it);
      n++;
    }
  }
  // Top up from any chapter if some chapter ran short.
  if (picked.length < size) {
    for (const it of shuffle(live, rand)) {
      if (picked.length >= size) break;
      if (usedFacts.has(it.fact_id)) continue;
      usedFacts.add(it.fact_id);
      picked.push(it);
    }
  }
  return shuffle(picked, rand).map((it) =>
    it.question_type === "true_false" ? it : { ...it, options: shuffle(it.options, rand) },
  );
}
