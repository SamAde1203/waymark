import { describe, expect, it } from "vitest";
import type { PublicItem } from "@waymark/content-schema";
import { isDatesNumbersItem, isSecured, newFactCard, pickDrillFacts, review } from "./index.ts";

function q(question: string, correct: string, type: PublicItem["question_type"] = "single"): PublicItem {
  const tf = type === "true_false";
  return {
    schema_version: 2,
    item_id: question,
    fact_id: question,
    item_version: 1,
    status: "live",
    source: { handbook_edition: "3", chapter_id: 3, section: "s", section_confirmed: true, page_ref: [], valid_from: "2013-03-25", valid_to: null },
    question_type: type,
    selections_required: 1,
    question_text: question,
    options: tf
      ? [
          { id: "a", text: "True", is_correct: correct === "True" },
          { id: "b", text: "False", is_correct: correct === "False" },
        ]
      : [
          { id: "a", text: correct, is_correct: true },
          { id: "b", text: "Other", is_correct: false },
        ],
    explanation_simple: "Because.",
    glossary_terms: [],
    difficulty_prior: 0.5,
    review: {},
    changelog: [],
  } as PublicItem;
}

describe("dates & numbers drill", () => {
  it("picks questions whose answer is a date or number", () => {
    expect(isDatesNumbersItem(q("In which year was King Charles I executed?", "1649"))).toBe(true);
    expect(isDatesNumbersItem(q("How many members are on a jury in Scotland?", "15"))).toBe(true);
    expect(isDatesNumbersItem(q("Rugby originated in England in which century?", "The early 19th century"))).toBe(true);
    expect(isDatesNumbersItem(q("On which date is St George's Day?", "23 April"))).toBe(true);
  });

  it("picks true/false statements that turn on a number", () => {
    expect(isDatesNumbersItem(q("Is the following statement TRUE or FALSE? A jury in England has 12 members.", "True", "true_false"))).toBe(true);
    expect(isDatesNumbersItem(q("Is the following statement TRUE or FALSE? The Isle of Man has its own government.", "True", "true_false"))).toBe(false);
  });

  it("ignores a year that is only context", () => {
    expect(isDatesNumbersItem(q("What was the 'Glorious Revolution' of 1688?", "William of Orange replaced James II"))).toBe(false);
    expect(isDatesNumbersItem(q("Who wrote the Water Music?", "Handel"))).toBe(false);
  });

  it("orders mistakes, then due, then unseen, then the rest", () => {
    const now = new Date("2026-11-21T12:00:00Z");
    const past = new Date("2026-11-01T12:00:00Z");
    const due = { ...newFactCard(past), due: new Date("2026-11-20T12:00:00Z") };
    const later = { ...newFactCard(past), due: new Date("2026-12-20T12:00:00Z") };
    const picked = pickDrillFacts({
      facts: ["rest", "unseen", "due", "mistake"],
      cards: { rest: later, due, mistake: later },
      mistakeFacts: new Set(["mistake"]),
      now,
      n: 3,
      rand: () => 0.5,
    });
    expect(picked).toEqual(["mistake", "due", "unseen"]);
  });

  it("counts a fact as secured only after two right answers", () => {
    const now = new Date("2026-11-21T12:00:00Z");
    let card = newFactCard(now);
    expect(isSecured(card, now)).toBe(false);
    card = review(card, true, null, now);
    const later = new Date(new Date(card.due).getTime() + 1000);
    card = review(card, true, null, later);
    expect(isSecured(card, later)).toBe(true);
  });
});
