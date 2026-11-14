import { describe, expect, it } from "vitest";
import { ItemSchema, toPublicItem } from "./index.ts";

const base = {
  schema_version: 2,
  item_id: "c3_test_a",
  fact_id: "c3_test",
  item_version: 1,
  status: "draft",
  source: { handbook_edition: "3", chapter_id: 3, section: "Test", page_ref: [], reviewer_note: "internal" },
  question_type: "single",
  selections_required: 1,
  question_text: "Which year?",
  options: [
    { id: "a", text: "1066", is_correct: true },
    { id: "b", text: "1215", is_correct: false },
  ],
  explanation_simple: "Because it was.",
};

describe("ItemSchema", () => {
  it("accepts a valid draft", () => {
    expect(ItemSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a live item without a page reference and reviewer", () => {
    const r = ItemSchema.safeParse({ ...base, status: "live" });
    expect(r.success).toBe(false);
  });

  it("accepts a live item with page and reviewer", () => {
    const r = ItemSchema.safeParse({
      ...base,
      status: "live",
      source: { ...base.source, page_ref: [55] },
      review: { reviewed_by: "SA", reviewed_at: "2026-12-01" },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a mismatch between correct options and selections", () => {
    const r = ItemSchema.safeParse({
      ...base,
      options: [
        { id: "a", text: "1066", is_correct: true },
        { id: "b", text: "1215", is_correct: true },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejects 'all of the above'", () => {
    const r = ItemSchema.safeParse({
      ...base,
      options: [...base.options, { id: "c", text: "All of the above", is_correct: false }],
    });
    expect(r.success).toBe(false);
  });

  it("strips the internal reviewer note before shipping", () => {
    const item = ItemSchema.parse(base);
    expect("reviewer_note" in toPublicItem(item).source).toBe(false);
  });
});
