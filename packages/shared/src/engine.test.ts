import { describe, expect, it } from "vitest";
import type { PublicItem } from "@waymark/content-schema";
import {
  apportion,
  buildMock,
  dueFacts,
  isCorrect,
  newFactCard,
  passProbability,
  readiness,
  review,
  schedulerFor,
  scoreExam,
} from "./index.ts";

function item(id: string, chapter: 1 | 2 | 3 | 4 | 5, fact = id, multi = false): PublicItem {
  return {
    schema_version: 2,
    item_id: id,
    fact_id: fact,
    item_version: 1,
    status: "live",
    source: { handbook_edition: "3", chapter_id: chapter, section: "s", section_confirmed: true, page_ref: [], valid_from: "2013-03-25", valid_to: null },
    question_type: multi ? "multi" : "single",
    selections_required: multi ? 2 : 1,
    question_text: "Question?",
    options: multi
      ? [
          { id: "a", text: "A", is_correct: true },
          { id: "b", text: "B", is_correct: false },
          { id: "c", text: "C", is_correct: true },
          { id: "d", text: "D", is_correct: false },
        ]
      : [
          { id: "a", text: "A", is_correct: true },
          { id: "b", text: "B", is_correct: false },
          { id: "c", text: "C", is_correct: false },
          { id: "d", text: "D", is_correct: false },
        ],
    explanation_simple: "Because.",
    glossary_terms: [],
    difficulty_prior: 0.5,
    review: {},
    changelog: [],
  };
}

describe("scoring", () => {
  it("needs the exact set for multi-select", () => {
    const q = item("m", 1, "m", true);
    expect(isCorrect(q, ["a", "c"])).toBe(true);
    expect(isCorrect(q, ["c", "a"])).toBe(true);
    expect(isCorrect(q, ["a"])).toBe(false);
    expect(isCorrect(q, ["a", "b", "c"])).toBe(false);
  });

  it("passes at 18 of 24", () => {
    const qs = Array.from({ length: 24 }, (_, i) => item(`q${i}`, 1));
    const answers = qs.map((q, i) => ({ item: q, selected: [i < 18 ? "a" : "b"] }));
    const r = scoreExam(answers);
    expect(r.score).toBe(18);
    expect(r.passed).toBe(true);
    answers[0]!.selected = ["b"];
    expect(scoreExam(answers).passed).toBe(false);
  });
});

describe("mock builder", () => {
  it("apportions 24 seats with at least one per chapter", () => {
    const q = apportion({ 1: 10, 2: 10, 3: 60, 4: 40, 5: 50 }, 24);
    expect(Object.values(q).reduce((a, b) => a + b, 0)).toBe(24);
    for (const ch of [1, 2, 3, 4, 5]) expect(q[ch]).toBeGreaterThanOrEqual(1);
  });

  it("builds 24 questions, one per fact, reproducible by seed", () => {
    const bank: PublicItem[] = [];
    for (const ch of [1, 2, 3, 4, 5] as const)
      for (let f = 0; f < 20; f++) {
        bank.push(item(`c${ch}f${f}a`, ch, `c${ch}f${f}`));
        bank.push(item(`c${ch}f${f}b`, ch, `c${ch}f${f}`));
      }
    const m1 = buildMock(bank, { seed: 42 });
    const m2 = buildMock(bank, { seed: 42 });
    expect(m1).toHaveLength(24);
    expect(new Set(m1.map((i) => i.fact_id)).size).toBe(24);
    expect(m1.map((i) => i.item_id)).toEqual(m2.map((i) => i.item_id));
  });

  it("prefers items not recently seen", () => {
    const bank = Array.from({ length: 60 }, (_, i) => item(`q${i}`, 3));
    const avoid = new Set(bank.slice(0, 30).map((i) => i.item_id));
    const m = buildMock(bank, { seed: 1, blueprint: { 3: 1 }, avoid });
    expect(m.every((i) => !avoid.has(i.item_id))).toBe(true);
  });
});

describe("readiness", () => {
  it("matches the binomial figures used in the report", () => {
    expect(passProbability(0.75)).toBeCloseTo(0.607, 2);
    expect(passProbability(0.8)).toBeCloseTo(0.811, 2);
    expect(passProbability(0.85)).toBeCloseTo(0.943, 2);
  });

  it("stays provisional without enough evidence", () => {
    const r = readiness({ 1: { attempts: 20, correct: 20 } }, { 1: 1 }, 20, 0);
    expect(r.band).toBe("provisional");
  });

  it("bands strong evidence as likely and weak as not yet", () => {
    const strong = readiness({ 1: { attempts: 200, correct: 184 } }, { 1: 1 }, 200, 3);
    expect(strong.band).toBe("likely");
    const weak = readiness({ 1: { attempts: 200, correct: 130 } }, { 1: 1 }, 200, 3);
    expect(weak.band).toBe("not_yet");
  });
});

describe("spaced repetition", () => {
  it("never schedules a review after the exam", () => {
    const now = new Date("2027-01-10T09:00:00Z");
    const exam = new Date("2027-01-20T09:00:00Z");
    let card = newFactCard(now);
    let t = now;
    for (let i = 0; i < 6; i++) {
      card = review(card, true, exam, t);
      t = new Date(card.due);
    }
    expect(new Date(card.due).getTime()).toBeLessThanOrEqual(exam.getTime());
  });

  it("raises retention in the final week", () => {
    const now = new Date("2027-01-15T09:00:00Z");
    expect(schedulerFor(new Date("2027-01-20T09:00:00Z"), now).parameters.request_retention).toBe(0.95);
    expect(schedulerFor(new Date("2027-03-20T09:00:00Z"), now).parameters.request_retention).toBe(0.9);
  });

  it("lists wrong answers as due soon", () => {
    const now = new Date("2027-01-10T09:00:00Z");
    const cards = {
      wrong: review(newFactCard(now), false, null, now),
      right: review(newFactCard(now), true, null, now),
    };
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    expect(dueFacts(cards, later)).toContain("wrong");
  });
});
