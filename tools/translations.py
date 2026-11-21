"""Build content/translations/<lang>.json from translator TSV files.

Each TSV line is `<hash>\t<translation>`, where <hash> is the first 12 hex digits of
sha1(English explanation). The JSON maps the exact English explanation to its
translation, so an explanation that is later edited no longer matches and its old
translation is simply not shown.

Usage: python3 tools/translations.py <lang> <tsv files...>
"""
import glob, hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def english_by_hash():
    out = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "content/items/chapter*.json"))):
        for item in json.load(open(path, encoding="utf-8")):
            e = item["explanation_simple"]
            out[hashlib.sha1(e.encode()).hexdigest()[:12]] = e
    return out


def main():
    lang, *files = sys.argv[1:]
    en = english_by_hash()
    path = os.path.join(ROOT, f"content/translations/{lang}.json")
    data = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    unknown = 0
    for f in files:
        for line in open(f, encoding="utf-8"):
            line = line.rstrip("\n")
            if not line.strip():
                continue
            h, text = line.split("\t", 1)
            if h not in en:
                unknown += 1
                continue
            data[en[h]] = text.strip()
    live = {k: v for k, v in data.items() if k in en.values()}
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(dict(sorted(live.items())), fh, ensure_ascii=False, indent=0)
        fh.write("\n")
    print(f"{lang}: {len(live)} of {len(set(en.values()))} explanations translated ({unknown} unknown lines skipped)")


if __name__ == "__main__":
    main()
