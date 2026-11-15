"""
Draft-question generator: turns a compact chapter spec into schema-valid item JSON.

Usage (from repo root):  python3 tools/qgen.py tools/specs/chapter2.py content/items/chapter2.json

A spec module defines CHAPTER (int) and ITEMS, a list of dicts:
  id, fact, sec        item id, fact id, handbook section heading (best guess until confirmed)
  t                    "single" | "multi" | "tf" | "statement"
  q                    question text (original wording)
  c                    list of correct option texts (tf: [True] or [False])
  w                    list of wrong option texts, or (text, rationale) tuples
  e                    plain-English explanation
  tip                  optional memory tip
  check                optional reason this item must be checked first (dates, numbers, names)
Every item is written as status "draft"; nothing goes live without review.
"""
import importlib.util
import json
import random
import sys


def load(path):
    spec = importlib.util.spec_from_file_location("spec", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build(mod):
    out, seen = [], set()
    rng = random.Random(mod.CHAPTER * 1000 + 7)
    for s in mod.ITEMS:
        if s["id"] in seen:
            raise SystemExit(f"duplicate id {s['id']}")
        seen.add(s["id"])
        t = s["t"]
        if t == "tf":
            ans = s["c"][0]
            opts = [("True", ans, None), ("False", not ans, None)]
            q = "Is the following statement TRUE or FALSE? " + s["q"]
            qtype, need = "true_false", 1
        else:
            wrong = [(w, None) if isinstance(w, str) else w for w in s["w"]]
            opts = [(c, True, None) for c in s["c"]] + [(w, False, r) for w, r in wrong]
            rng.shuffle(opts)
            q = s["q"]
            qtype = {"single": "single", "multi": "multi", "statement": "statement"}[t]
            need = 2 if t == "multi" else 1
        options = []
        for i, (text, ok, why) in enumerate(opts):
            o = {"id": "abcdef"[i], "text": text, "is_correct": ok}
            if why:
                o["rationale"] = why
            options.append(o)
        note = "Confirm the section heading wording in the handbook"
        if s.get("check"):
            note = "CHECK FIRST: " + s["check"] + ". " + note
        item = {
            "schema_version": 2,
            "item_id": s["id"],
            "fact_id": s["fact"],
            "item_version": 1,
            "status": "draft",
            "source": {
                "handbook_edition": "3",
                "chapter_id": mod.CHAPTER,
                "section": s["sec"],
                "section_confirmed": False,
                "page_ref": [],
                "reviewer_note": note,
            },
            "question_type": qtype,
            "selections_required": need,
            "question_text": q,
            "options": options,
            "explanation_simple": s["e"],
        }
        if s.get("tip"):
            item["memory_tip"] = s["tip"]
        out.append(item)
    return out


if __name__ == "__main__":
    # Usage: qgen.py spec1.py [spec2.py ...] out.json  (all specs must share CHAPTER)
    *specs, out = sys.argv[1:]
    items = []
    for path in specs:
        items += build(load(path))
    ids = [i["item_id"] for i in items]
    dupes = {x for x in ids if ids.count(x) > 1}
    if dupes:
        raise SystemExit(f"duplicate ids across specs: {sorted(dupes)}")
    sys.argv[2:] = [out]
    with open(out, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"{len(items)} items -> {out}")
