#!/usr/bin/env python3
"""
Merge GS Paper I PYQs from Insights on India subject-wise index into data/gs-paper-1.json.

Source: https://www.insightsonindia.com/upsc-mains-general-studies-1-pyq/

Usage:
  python3 scripts/build-gs1-insights.py
  python3 scripts/build-gs1-insights.py --input path/to/export.md
  python3 scripts/build-gs1-insights.py --fetch
  python3 scripts/build-gs1-insights.py --dry-run
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "gs-paper-1.json"
DEFAULT_MD = ROOT / "data" / "sources" / "insights-gs1-pyq.md"
SOURCE_URL = "https://www.insightsonindia.com/upsc-mains-general-studies-1-pyq/"

STOP_MARKERS = (
    "### Insights IAS",
    "### About Us",
    "#### Search Here",
    "MENUMENU",
    "Preparing for the",
)

# First content section on the Insights page (start parsing here)
CONTENT_START = "Salient aspects of Art Forms"

_spec = importlib.util.spec_from_file_location(
    "build_pyq_data", ROOT / "scripts" / "build-pyq-data.py"
)
_build = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(_build)


def detect_marks(text: str) -> int:
    m = re.search(r"\(\s*(\d+(?:\.\d+)?)\s*M\s*\)", text, re.I)
    if m:
        val = float(m.group(1))
        return 15 if val >= 12.5 else 10
    if re.search(r"\b250\s*words\b", text, re.I):
        return 15
    if re.search(r"\b150\s*words\b", text, re.I):
        return 10
    return 10


def clean_insights_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\(\s*\d+(?:\.\d+)?\s*M\s*\)\s*$", "", text, flags=re.I).strip()
    text = re.sub(r"\(\s*Answer in \d+ words\)\s*\d*\s*$", "", text, flags=re.I).strip()
    return text


def norm_key(text: str) -> str:
    t = text.lower()
    t = re.sub(r"\(\s*\d+(?:\.\d+)?\s*m\s*\)", "", t)
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def texts_similar(a: str, b: str) -> bool:
    if a == b:
        return True
    if len(a) < 40 or len(b) < 40:
        return a in b or b in a
    return a[:50] == b[:50] or a[:40] in b or b[:40] in a


def parse_insights_markdown(content: str) -> list[dict]:
    lines = content.splitlines()
    start = 0
    for i, line in enumerate(lines):
        if CONTENT_START in line:
            start = i
            break

    section: str | None = None
    year: int | None = None
    buf: list[str] = []
    raw: list[dict] = []

    def flush() -> None:
        nonlocal buf, section, year
        if year is None or not buf:
            buf = []
            return
        text = clean_insights_text(" ".join(buf))
        buf = []
        if len(text) < 25:
            return
        lower = text.lower()
        if any(x in lower for x in ("insightsonindia", "call us @", "sign in")):
            return
        raw.append(
            {
                "year": year,
                "text": text,
                "marks": detect_marks(text),
                "insightsSection": section or "",
            }
        )

    for line in lines[start:]:
        stripped = line.strip()
        if any(stripped.startswith(m) for m in STOP_MARKERS):
            break

        if re.fullmatch(r"20\d{2}", stripped):
            flush()
            year = int(stripped)
            continue

        if stripped.startswith(("* ", "- ")):
            flush()
            buf = [stripped[2:].strip()]
            continue

        if buf and stripped and not stripped.startswith("#"):
            if len(stripped) > 2:
                buf.append(stripped)
            continue

        if (
            stripped
            and not stripped.startswith("#")
            and not re.fullmatch(r"20\d{2}", stripped)
            and len(stripped) > 8
        ):
            flush()
            section = stripped

    flush()

    # Dedupe by normalized text (Insights repeats questions under multiple sections)
    seen: set[str] = set()
    unique: list[dict] = []
    for item in raw:
        key = norm_key(item["text"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def fetch_markdown() -> str:
    req = urllib.request.Request(
        SOURCE_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; upsc-pyq-builder/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    text = re.sub(r"(?is)<script.*?>.*?</script>", "", html)
    text = re.sub(r"(?is)<style.*?>.*?</style>", "", text)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text)


def load_existing() -> dict:
    if not OUT.is_file():
        return {
            "paper": 1,
            "title": "General Studies Paper I",
            "syllabus": _build.META[1]["syllabus"],
            "yearRange": [2013, 2025],
            "themes": [_build.THEME_CONFIG["1"]["themes"][i]["name"] for i in range(len(_build.THEME_CONFIG["1"]["themes"]))],
            "questions": [],
        }
    return json.loads(OUT.read_text(encoding="utf-8"))


def merge_questions(
    existing: list[dict],
    insights: list[dict],
    preserved: dict,
    *,
    target_per_year: int = 20,
    fill_years: set[int] | None = None,
) -> tuple[list[dict], int]:
    """Add Insights questions not already present; cap growth on years that are already full."""
    merged = list(existing)
    known: list[tuple[int, str]] = [(q["year"], norm_key(q["text"])) for q in existing]
    year_max: dict[int, int] = defaultdict(int)
    year_count: dict[int, int] = defaultdict(int)
    for q in existing:
        year_count[q["year"]] += 1
        if isinstance(q.get("number"), int):
            year_max[q["year"]] = max(year_max[q["year"]], q["number"])

    added = 0
    for item in sorted(insights, key=lambda x: (x["year"], x["text"])):
        year = item["year"]
        if fill_years is not None and year not in fill_years:
            continue
        if year_count[year] >= target_per_year:
            continue
        key = norm_key(item["text"])
        if any(texts_similar(key, k) for y, k in known if y == year):
            continue
        year_max[year] += 1
        num = year_max[year]
        entry = _build.normalize_entry(1, year, num, item["text"], item["marks"], preserved)
        if not entry:
            continue
        if item.get("insightsSection"):
            entry["insightsSection"] = item["insightsSection"]
        merged.append(entry)
        known.append((year, key))
        year_count[year] += 1
        added += 1
    return merged, added


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Insights page markdown export")
    parser.add_argument("--fetch", action="store_true", help="Fetch live page")
    parser.add_argument("--dry-run", action="store_true", help="Report only; do not write JSON")
    parser.add_argument(
        "--fill-all-years",
        action="store_true",
        help="Add Insights questions for any year below 20 (may create near-duplicates)",
    )
    args = parser.parse_args()

    _build.load_theme_config()

    if args.fetch:
        content = fetch_markdown()
    else:
        md_path = args.input or DEFAULT_MD
        if not md_path.is_file():
            print(f"Input not found: {md_path}")
            return 1
        content = md_path.read_text(encoding="utf-8")

    insights = parse_insights_markdown(content)
    payload = load_existing()
    preserved = _build.load_preserved_notes()
    existing = payload.get("questions", [])
    year_count = defaultdict(int)
    for q in existing:
        year_count[q["year"]] += 1
    fill_years = (
        None
        if args.fill_all_years
        else {y for y in range(2013, 2026) if year_count[y] == 0}
    )
    merged, added = merge_questions(
        existing,
        insights,
        preserved,
        fill_years=fill_years if not args.fill_all_years else None,
    )

    by_year = defaultdict(int)
    for q in merged:
        by_year[q["year"]] += 1

    print(f"Insights unique questions: {len(insights)}")
    print(f"Added to gs-paper-1.json: {added}")
    print(f"Total questions: {len(merged)}")
    print("Per year:", ", ".join(f"{y}({by_year[y]})" for y in sorted(by_year)))

    if args.dry_run:
        return 0

    payload["questions"] = sorted(merged, key=lambda q: (-q["year"], q.get("number", 0)))
    payload["source"] = SOURCE_URL
    years = sorted(by_year)
    if years:
        payload["yearRange"] = [min(years), max(years)]
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
