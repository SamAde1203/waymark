import { z } from "zod";

/**
 * Waymark content schema.
 *
 * The atomic unit is a handbook FACT. Questions ("items") are variants that test a fact.
 * Every item carries the handbook edition, chapter and SECTION HEADING it rests on
 * (headings match in print and Kindle; page numbers are optional extras), so the bank can be
 * re-based when the handbook changes. Question wording is always original: nothing
 * here may reproduce handbook text, except `source.reviewer_note`, which is internal
 * and is stripped by `toPublicItem` before anything ships.
 */

export const CHAPTERS = {
  1: "The values and principles of the UK",
  2: "What is the UK?",
  3: "A long and illustrious history",
  4: "A modern, thriving society",
  5: "The UK government, the law and your role",
} as const;

export type ChapterId = keyof typeof CHAPTERS;

const chapterId = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const slug = z
  .string()
  .regex(/^[a-z0-9_]+$/, "lowercase letters, digits and underscores only");

export const OptionSchema = z.object({
  id: z.string().regex(/^[a-f]$/, "option ids are a-f"),
  text: z.string().min(1),
  is_correct: z.boolean(),
  rationale: z.string().optional(),
});

export const SourceSchema = z.object({
  handbook_edition: z.literal("3"),
  /** Print impression the page numbers were checked against, e.g. "2024 reprint". */
  impression_checked: z.string().optional(),
  chapter_id: chapterId,
  /** The handbook section heading, exactly as printed. Shown to users as the source. */
  section: z.string().min(1),
  /** True once a reviewer has checked the heading against their copy of the handbook. */
  section_confirmed: z.boolean().default(false),
  /** Optional print page numbers (only if checked against the paperback). */
  page_ref: z.array(z.number().int().positive()).default([]),
  /** Internal only: where the reviewer found the fact. Never shipped. */
  reviewer_note: z.string().optional(),
  valid_from: z.string().default("2013-03-25"),
  valid_to: z.string().nullable().default(null),
});

export const ItemStatus = z.enum(["draft", "reviewed", "live", "retired"]);

export const QuestionType = z.enum([
  "single", // one correct answer
  "multi", // "Which TWO..." – selections_required correct answers
  "true_false", // two options: True / False
  "statement", // "Which of these statements is correct?" – one correct
]);

export const ItemSchema = z
  .object({
    schema_version: z.literal(2),
    item_id: slug,
    fact_id: slug,
    item_version: z.number().int().positive(),
    status: ItemStatus,
    source: SourceSchema,
    question_type: QuestionType,
    selections_required: z.number().int().min(1).max(2),
    question_text: z.string().min(5),
    options: z.array(OptionSchema).min(2).max(6),
    explanation_simple: z.string().min(5),
    explanation_full: z.string().optional(),
    memory_tip: z.string().optional(),
    glossary_terms: z.array(z.string()).default([]),
    difficulty_prior: z.number().min(0).max(1).default(0.5),
    review: z
      .object({
        reviewed_by: z.string().optional(),
        reviewed_at: z.string().optional(),
      })
      .default({}),
    changelog: z
      .array(z.object({ version: z.number().int(), date: z.string(), note: z.string() }))
      .default([]),
  })
  .superRefine((item, ctx) => {
    const correct = item.options.filter((o) => o.is_correct).length;
    if (correct !== item.selections_required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `has ${correct} correct options but selections_required is ${item.selections_required}`,
      });
    }
    if (item.question_type === "multi" && item.selections_required !== 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "multi questions require exactly 2 selections" });
    }
    if (item.question_type !== "multi" && item.selections_required !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "only multi questions may require 2 selections" });
    }
    if (item.question_type === "true_false" && item.options.length !== 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "true_false questions need exactly 2 options" });
    }
    const ids = item.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate option ids" });
    }
    const texts = item.options.map((o) => o.text.trim().toLowerCase());
    if (new Set(texts).size !== texts.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate option texts" });
    }
    if (item.status === "live") {
      if (!item.source.section_confirmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "live items need source.section_confirmed (heading checked against the handbook)",
        });
      }
      if (!item.review.reviewed_by || !item.review.reviewed_at) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "live items need reviewed_by and reviewed_at" });
      }
    }
    const banned = /\b(all of the above|none of the above)\b/i;
    if (item.options.some((o) => banned.test(o.text))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "avoid 'all/none of the above' options" });
    }
  });

export type Item = z.infer<typeof ItemSchema>;
export type ItemOption = z.infer<typeof OptionSchema>;

/** What ships to users: internal reviewer notes removed. */
export type PublicItem = Omit<Item, "source"> & {
  source: Omit<Item["source"], "reviewer_note">;
};

export function toPublicItem(item: Item): PublicItem {
  const { reviewer_note: _omit, ...source } = item.source;
  return { ...item, source };
}

export const FactSchema = z.object({
  fact_id: slug,
  chapter_id: chapterId,
  section: z.string().min(1),
  /** One-line restatement of the fact in original wording. */
  summary: z.string().min(5),
  page_ref: z.array(z.number().int().positive()).default([]),
  tags: z.array(z.string()).default([]),
});

export type Fact = z.infer<typeof FactSchema>;
