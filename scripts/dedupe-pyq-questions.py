#!/usr/bin/env python3
"""
Remove duplicate and junk questions from GS paper JSON files.

Does NOT touch math papers (question text is scan labels, not comparable).

Usage:
  python3 scripts/dedupe-pyq-questions.py
  python3 scripts/dedupe-pyq-questions.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GS_FILES = [
    ROOT / "data" / "gs-paper-1.json",
    ROOT / "data" / "gs-paper-2.json",
    ROOT / "data" / "gs-paper-3.json",
    ROOT / "data" / "gs-paper-4.json",
]

JUNK_PATTERNS = (
    r"total of \d+ questions are asked",
    r"table of contents",
    r"toggle gs paper",
    r"question paper analysis",
    r"upsc cse mains \d{4} gs paper",
)

MAX_GS_NUMBER = 20


def empty_notes() -> dict:
    return {
        "introduction": "",
        "staticNotes": "",
        "quotes": "",
        "currentAffairs": "",
        "topperPoints": "",
        "valueMaterial": "",
    }


def norm(text: str) -> str:
    text = re.sub(r"\s+", " ", text.lower().strip())
    text = re.sub(r"\(\s*answer in \d+ words\)\s*", "", text, flags=re.I)
    text = re.sub(r"\(\s*\d+\.?\d*\s*m\w*\s*\)", "", text, flags=re.I)
    text = re.sub(r"\b\d+\s*mark\b", "", text, flags=re.I)
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def note_score(q: dict) -> int:
    notes = q.get("notes") or {}
    return sum(1 for v in notes.values() if str(v).strip())


def is_junk(q: dict) -> bool:
    text = q.get("text", "")
    lower = text.lower()
    if len(text) < 25:
        return True
    for pat in JUNK_PATTERNS:
        if re.search(pat, lower):
            return True
    num = q.get("number")
    if isinstance(num, int) and num > 50:
        return True
    return False


def is_duplicate_text(a: str, b: str) -> bool:
    if not a or not b:
        return False
    if a == b:
        return True
    if SequenceMatcher(None, a, b).ratio() >= 0.88:
        return True
    sa, sb = set(a.split()), set(b.split())
    if sa and sb and len(sa & sb) / len(sa | sb) >= 0.92:
        return True
    short, long = (a, b) if len(a) < len(b) else (b, a)
    if len(short) > 80 and short in long and len(short) / len(long) > 0.45:
        return True
    return False


def pick_keeper(cluster: list[dict]) -> dict:
    def score(q: dict) -> tuple:
        num = q.get("number")
        valid_num = isinstance(num, int) and 1 <= num <= MAX_GS_NUMBER
        return (note_score(q), valid_num, -num if isinstance(num, int) else 0, len(q["text"]))

    return max(cluster, key=score)


def merge_notes(keeper: dict, other: dict) -> None:
    kn = keeper.setdefault("notes", empty_notes())
    on = other.get("notes") or {}
    for key, val in on.items():
        if str(val).strip() and not str(kn.get(key, "")).strip():
            kn[key] = val


def find_duplicate_clusters(questions: list[dict]) -> list[list[dict]]:
    n = len(questions)
    parent = list(range(n))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i: int, j: int) -> None:
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[rj] = ri

    norms = [norm(q["text"]) for q in questions]
    for i in range(n):
        for j in range(i + 1, n):
            if is_duplicate_text(norms[i], norms[j]):
                union(i, j)

    clusters_map: dict[int, list[dict]] = defaultdict(list)
    for i, q in enumerate(questions):
        clusters_map[find(i)].append(q)

    return [c for c in clusters_map.values() if len(c) > 1]


def find_partial_duplicates(questions: list[dict]) -> list[tuple[dict, dict]]:
    """High question numbers that repeat a valid 1–20 question (parse errors)."""
    low = [q for q in questions if isinstance(q.get("number"), int) and 1 <= q["number"] <= MAX_GS_NUMBER]
    high = [q for q in questions if isinstance(q.get("number"), int) and q["number"] > MAX_GS_NUMBER]
    removals: list[tuple[dict, dict]] = []
    for h in high:
        nh = norm(h["text"])
        best = None
        best_ratio = 0.0
        for l in low:
            nl = norm(l["text"])
            r = SequenceMatcher(None, nh, nl).ratio()
            if nh in nl or nl in nh:
                r = max(r, 0.85)
            if r > best_ratio:
                best_ratio = r
                best = l
        if best and best_ratio >= 0.62:
            removals.append((h, best))
    return removals


def dedupe_paper(path: Path, dry_run: bool) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    questions = data.get("questions", [])
    remove_ids: set[str] = set()
    actions: list[str] = []

    by_year: dict[int, list[dict]] = defaultdict(list)
    for q in questions:
        by_year[q["year"]].append(q)

    for year, qs in sorted(by_year.items()):
        for q in qs:
            if is_junk(q):
                remove_ids.add(q["id"])
                actions.append(f"  junk [{year}] {q['id']} (#{q.get('number')})")

        for cluster in find_duplicate_clusters(qs):
            keeper = pick_keeper(cluster)
            for q in cluster:
                if q["id"] == keeper["id"]:
                    continue
                merge_notes(keeper, q)
                remove_ids.add(q["id"])
                actions.append(f"  dup  [{year}] {q['id']} -> {keeper['id']}")

        for bad, keeper in find_partial_duplicates(qs):
            if bad["id"] in remove_ids:
                continue
            merge_notes(keeper, bad)
            remove_ids.add(bad["id"])
            actions.append(
                f"  partial [{year}] {bad['id']} (#{bad.get('number')}) -> {keeper['id']}"
            )

    if not remove_ids:
        print(f"{path.name}: no duplicates removed")
        return 0

    print(f"{path.name}: remove {len(remove_ids)}")
    for line in actions:
        print(line)

    if dry_run:
        return len(remove_ids)

    kept = [q for q in questions if q["id"] not in remove_ids]
    data["questions"] = sorted(kept, key=lambda q: (-q["year"], q.get("number", 0)))
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return len(remove_ids)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    total = 0
    for path in GS_FILES:
        if not path.is_file():
            print(f"Skip missing {path}")
            continue
        total += dedupe_paper(path, args.dry_run)

    print(f"\n{'Would remove' if args.dry_run else 'Removed'} {total} question(s) total.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
