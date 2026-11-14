import { CHAPTERS, ItemSchema, toPublicItem, type PublicItem } from "@waymark/content-schema";
import ch1 from "../../../../content/items/chapter1.json";
import ch2 from "../../../../content/items/chapter2.json";
import ch3 from "../../../../content/items/chapter3.json";
import ch4 from "../../../../content/items/chapter4.json";
import ch5 from "../../../../content/items/chapter5.json";

export type ChapterId = 1 | 2 | 3 | 4 | 5;
export { CHAPTERS };

const all: PublicItem[] = [ch1, ch2, ch3, ch4, ch5]
  .flat()
  .map((raw) => toPublicItem(ItemSchema.parse(raw)))
  .filter((i) => i.status !== "retired");

/**
 * Until enough questions are approved, the app runs in PREVIEW mode on drafts and says so.
 * Once 800+ are live, only live questions are used.
 */
const approved = all.filter((i) => i.status === "live");
export const PREVIEW = approved.length < 800;
export const BANK: PublicItem[] = PREVIEW ? all : approved;

export const ITEM_BY_ID: Record<string, PublicItem> = Object.fromEntries(BANK.map((i) => [i.item_id, i]));

export const ITEMS_BY_FACT: Record<string, PublicItem[]> = {};
for (const it of BANK) (ITEMS_BY_FACT[it.fact_id] ??= []).push(it);

export const FACT_IDS = Object.keys(ITEMS_BY_FACT);
export const FACT_CHAPTER: Record<string, ChapterId> = Object.fromEntries(
  BANK.map((i) => [i.fact_id, i.source.chapter_id as ChapterId]),
);

/** Sections per chapter, in the order they first appear in the bank. */
export const SECTIONS: Record<ChapterId, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
for (const it of BANK) {
  const list = SECTIONS[it.source.chapter_id as ChapterId];
  if (!list.includes(it.source.section)) list.push(it.source.section);
}

/** Blueprint weights: share of distinct facts per chapter (Waymark's own default; official mix unpublished). */
export const CHAPTER_WEIGHTS: Record<number, number> = {};
for (const f of FACT_IDS) CHAPTER_WEIGHTS[FACT_CHAPTER[f]!] = (CHAPTER_WEIGHTS[FACT_CHAPTER[f]!] ?? 0) + 1;

export const FREE_CHAPTERS: ChapterId[] = [1, 2];
