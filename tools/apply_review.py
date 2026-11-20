"""
Applies Sam's review decisions to the question bank.

Decisions live apart from the generated questions, so regenerating with qgen never loses them:
  content/review/sections.json  "<chapter>|<section we use>" -> {"confirmed": true, "book_name": "<heading in the book>"}
  content/review/items.json     item_id -> {"decision": "approved"|"needs_change", "note", "reviewed_at", "fingerprint"}

A question goes live only when it is approved, its section heading is confirmed, and its wording is
unchanged since approval (the fingerprint). If a question changes after approval it drops back to draft.

Usage (from repo root):
  python3 tools/apply_review.py                         apply decisions to content/items/*.json
  python3 tools/apply_review.py --import export.json    first record decisions exported from the review sheet
     export.json is a list of {"id", "status", "note", "question", "answer"} rows, or
     {"items": [...], "sections": [{"chapter", "section", "status", "book_name"}]}
"""
import hashlib
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ITEMS_DIR = ROOT / "content" / "items"
REVIEW_DIR = ROOT / "content" / "review"
SECTIONS_FILE = REVIEW_DIR / "sections.json"
DECISIONS_FILE = REVIEW_DIR / "items.json"
REVIEWER = "Sam Adeyemi"


def load(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True) + "\n")


def sheet_question(item):
    """The question as the review sheet shows it."""
    q = item["question_text"]
    if item["question_type"] == "multi" and not q.endswith("(choose 2)"):
        q += " (choose 2)"
    return q


def sheet_answer(item):
    return " + ".join(o["text"] for o in item["options"] if o["is_correct"])


def norm(s):
    return " ".join(str(s).replace("'", "").split()).lower()


def fingerprint(item):
    """Everything a learner sees. Any change to it needs a fresh approval."""
    seen = {
        "q": item["question_text"],
        "type": item["question_type"],
        "options": sorted((o["text"], o["is_correct"]) for o in item["options"]),
        "explanation": item.get("explanation_simple", ""),
        "tip": item.get("memory_tip", ""),
        "chapter": item["source"]["chapter_id"],
    }
    return hashlib.sha256(json.dumps(seen, sort_keys=True).encode()).hexdigest()[:16]


def all_items():
    for path in sorted(ITEMS_DIR.glob("chapter*.json")):
        yield path, json.loads(path.read_text())


def import_export(path):
    data = json.loads(Path(path).read_text())
    rows = data["items"] if isinstance(data, dict) else data
    sections_rows = data.get("sections", []) if isinstance(data, dict) else []

    sections = load(SECTIONS_FILE, {})
    for r in sections_rows:
        key = f'{r["chapter"]}|{r["section"]}'
        status = (r.get("status") or "").strip().lower()
        book = (r.get("book_name") or "").strip()
        if status == "matches":
            sections[key] = {"confirmed": True, "book_name": r["section"]}
        elif status == "different" and book:
            sections[key] = {"confirmed": True, "book_name": book}
        else:
            sections.pop(key, None)
    save(SECTIONS_FILE, sections)

    by_id = {}
    for _, items in all_items():
        for it in items:
            by_id[it["item_id"]] = it
    decisions = load(DECISIONS_FILE, {})
    today = date.today().isoformat()
    stale, unknown = [], []
    for r in rows:
        iid = (r.get("id") or "").strip()
        status = (r.get("status") or "").strip().lower()
        if not iid:
            continue
        it = by_id.get(iid)
        if not it:
            unknown.append(iid)
            continue
        prev = decisions.get(iid)
        if status == "approved":
            # Only count it if the sheet showed the question as it is now.
            if norm(r.get("question", "")) != norm(sheet_question(it)) or norm(r.get("answer", "")) != norm(sheet_answer(it)):
                stale.append(iid)
                continue
            fp = fingerprint(it)
            if not (prev and prev.get("decision") == "approved" and prev.get("fingerprint") == fp):
                decisions[iid] = {"decision": "approved", "reviewed_at": today, "fingerprint": fp, "note": r.get("note") or ""}
        elif status == "needs change":
            decisions[iid] = {"decision": "needs_change", "reviewed_at": today, "note": r.get("note") or ""}
        else:
            decisions.pop(iid, None)
    save(DECISIONS_FILE, decisions)
    if stale:
        print(f"{len(stale)} approvals skipped: the question changed since the sheet was made ({', '.join(stale[:5])}...)")
    if unknown:
        print(f"{len(unknown)} sheet rows name questions that no longer exist ({', '.join(unknown[:5])})")


def apply():
    sections = load(SECTIONS_FILE, {})
    decisions = load(DECISIONS_FILE, {})
    counts = {"live": 0, "draft": 0, "changed_since_approval": 0, "needs_change": 0, "section_unconfirmed": 0}
    fixes = []
    for path, items in all_items():
        for it in items:
            src = it["source"]
            key = f'{src["chapter_id"]}|{src["section"]}'
            sec = sections.get(key)
            if sec:
                src["section"] = sec["book_name"]
                src["section_confirmed"] = True
            elif not any(v["book_name"] == src["section"] for k, v in sections.items() if k.startswith(f'{src["chapter_id"]}|')):
                src["section_confirmed"] = False

            d = decisions.get(it["item_id"])
            live = (
                d is not None
                and d["decision"] == "approved"
                and d.get("fingerprint") == fingerprint(it)
                and src["section_confirmed"]
            )
            if live:
                it["status"] = "live"
                it["review"] = {"reviewed_by": REVIEWER, "reviewed_at": d["reviewed_at"]}
                counts["live"] += 1
            else:
                if it["status"] in ("live", "reviewed"):
                    it["status"] = "draft"
                it["review"] = {}
                counts["draft"] += 1
                if d and d["decision"] == "approved" and d.get("fingerprint") != fingerprint(it):
                    counts["changed_since_approval"] += 1
                elif d and d["decision"] == "approved":
                    counts["section_unconfirmed"] += 1
                if d and d["decision"] == "needs_change":
                    counts["needs_change"] += 1
                    fixes.append((it["item_id"], d.get("note", "")))
        path.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n")
    print("review:", ", ".join(f"{k.replace('_', ' ')} {v}" for k, v in counts.items()))
    if fixes:
        out = REVIEW_DIR / "needs-change.md"
        out.write_text("# Questions marked Needs change\n\n" + "".join(f"- `{i}`: {n or '(no note)'}\n" for i, n in fixes))
        print(f"{len(fixes)} to fix, listed in {out.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--import":
        import_export(sys.argv[2])
    apply()
