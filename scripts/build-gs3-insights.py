#!/usr/bin/env python3
"""
Build data/gs-paper-3.json from Insights on India subject-wise GS III PYQ page.

Source: https://www.insightsonindia.com/upsc-mains-general-studies-3-pyq/

Usage:
  python3 scripts/build-gs3-insights.py
  python3 scripts/build-gs3-insights.py --input path/to/export.md
  python3 scripts/build-gs3-insights.py --fetch
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "gs-paper-3.json"
THEMES_FILE = ROOT / "data" / "themes.json"
DEFAULT_MD = ROOT / "data" / "sources" / "insights-gs3-pyq.md"
SOURCE_URL = "https://www.insightsonindia.com/upsc-mains-general-studies-3-pyq/"

# Insights syllabus sections → closest app theme (for notes/keywords compatibility)
SECTION_META = {
    "Indian Economy": {
        "themeId": "fiscal-monetary-growth",
        "theme": "Fiscal, Monetary & Growth",
        "themeParent": "Economy & Development",
    },
    "Inclusive Growth": {
        "themeId": "fiscal-monetary-growth",
        "theme": "Fiscal, Monetary & Growth",
        "themeParent": "Economy & Development",
    },
    "Government Budgeting": {
        "themeId": "fiscal-monetary-growth",
        "theme": "Fiscal, Monetary & Growth",
        "themeParent": "Economy & Development",
    },
    "Agriculture and Food Security": {
        "themeId": "crops-farmers",
        "theme": "Crops & Farmers",
        "themeParent": "Agriculture & Food Security",
    },
    "Food Processing and Related Industries in India": {
        "themeId": "irrigation-agri-economy",
        "theme": "Irrigation & Agro-Industries",
        "themeParent": "Agriculture & Food Security",
    },
    "Land Reforms in India": {
        "themeId": "employment-labour",
        "theme": "Employment & Labour",
        "themeParent": "Economy & Development",
    },
    "Effects of Liberalization on the Economy, Industrial Policy": {
        "themeId": "industry-infrastructure",
        "theme": "Industry, MSME & Infrastructure",
        "themeParent": "Economy & Development",
    },
    "Infrastructure": {
        "themeId": "industry-infrastructure",
        "theme": "Industry, MSME & Infrastructure",
        "themeParent": "Economy & Development",
    },
    "Investment Models": {
        "themeId": "industry-infrastructure",
        "theme": "Industry, MSME & Infrastructure",
        "themeParent": "Economy & Development",
    },
    "Science and Technology": {
        "themeId": "space-nuclear-defence",
        "theme": "Space, Nuclear & Defence Tech",
        "themeParent": "Science & Technology",
    },
    "Environment, Climate Change, and Conservation": {
        "themeId": "climate-energy",
        "theme": "Climate Change & Energy",
        "themeParent": "Environment & Biodiversity",
    },
    "Disaster Management": {
        "themeId": "disaster-management",
        "theme": "Disaster Management",
        "themeParent": "Environment & Biodiversity",
    },
    "Internal Security": {
        "themeId": "terrorism-insurgency",
        "theme": "Terrorism & Insurgency",
        "themeParent": "Internal Security",
    },
}

INSIGHTS_SECTION_ORDER = list(SECTION_META.keys())

STOP_MARKERS = (
    "### Insights IAS",
    "### About Us",
    "No Related Posts",
    "#### Search Here",
    "MENUMENU",
)


def empty_notes() -> dict:
    return {
        "introduction": "",
        "staticNotes": "",
        "quotes": "",
        "currentAffairs": "",
        "topperPoints": "",
        "valueMaterial": "",
    }


def normalize_section(line: str) -> str | None:
    s = line.strip()
    if not s or s.startswith("#") or s.startswith("*") or s.startswith("|"):
        return None
    if re.match(r"^\d{4}$", s):
        return None
    if s in STOP_MARKERS:
        return None
    return SECTION_META.get(s) and s or None


def clean_text(text: str) -> str:
    text = re.sub(r"\\(\d)", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\(\s*(\d{4})\s*\)\s*$", "", text).strip()
    return text


def detect_marks(text: str) -> int | float:
    m = re.search(r"\((\d+(?:\.\d+)?)\s*M\)", text, re.I)
    if m:
        val = float(m.group(1))
        if val >= 15:
            return 15
        if val >= 12:
            return 12.5
        return 10
    if re.search(r"\b250\s*words\b", text, re.I):
        return 15
    return 10


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:36] or "q"


def parse_insights_markdown(content: str) -> list[dict]:
    lines = content.splitlines()
    start = 0
    for i, line in enumerate(lines):
        if line.strip() == "Indian Economy":
            start = i
            break

    section: str | None = None
    year: int | None = None
    buf: list[str] = []
    questions: list[dict] = []
    per_year_counter: dict[int, int] = defaultdict(int)
    per_section_year: dict[tuple[str, int], int] = defaultdict(int)

    def flush() -> None:
        nonlocal buf, section, year
        if not section or year is None or not buf:
            buf = []
            return
        text = clean_text(" ".join(buf))
        buf = []
        if len(text) < 20:
            return
        lower = text.lower()
        if "insightsonindia" in lower or "call us @" in lower:
            return

        meta = SECTION_META[section]
        per_year_counter[year] += 1
        per_section_year[(section, year)] += 1
        idx = per_section_year[(section, year)]
        sec_slug = slugify(section)
        qid = f"gs3-{year}-{sec_slug}-{idx}"

        questions.append(
            {
                "id": qid,
                "year": year,
                "number": per_year_counter[year],
                "marks": detect_marks(text),
                "text": text,
                "theme": meta["theme"],
                "themeId": meta["themeId"],
                "themeParent": meta["themeParent"],
                "insightsSection": section,
                "subthemes": [],
                "notes": empty_notes(),
            }
        )

    for line in lines[start:]:
        stripped = line.strip()
        if any(stripped.startswith(m) for m in STOP_MARKERS):
            break

        cat = normalize_section(stripped)
        if cat:
            flush()
            section = cat
            year = None
            continue

        if re.match(r"^\d{4}$", stripped):
            flush()
            year = int(stripped)
            continue

        if stripped.startswith("* "):
            flush()
            buf = [stripped[2:].strip()]
            continue

        if buf and stripped and not stripped.startswith("#"):
            buf.append(stripped)

    flush()
    return questions


def restore_notes(questions: list[dict]) -> None:
    if not OUT.is_file():
        return
    try:
        old = json.loads(OUT.read_text(encoding="utf-8")).get("questions", [])
    except Exception:
        return

    by_key: dict[tuple[int, str], dict] = {}
    for q in questions:
        by_key[(q["year"], q["text"][:100].lower())] = q

    for oq in old:
        notes = oq.get("notes")
        if not notes or not any(str(v).strip() for v in notes.values()):
            continue
        key = (oq["year"], oq["text"][:100].lower())
        if key in by_key:
            by_key[key]["notes"] = notes


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


def update_themes_json() -> None:
    with open(THEMES_FILE, encoding="utf-8") as f:
        themes = json.load(f)

    themes["3"]["insightsSections"] = [
        {
            "id": slugify(name),
            "name": name,
            "displayName": name,
            "themeId": SECTION_META[name]["themeId"],
            "parent": SECTION_META[name]["themeParent"],
        }
        for name in INSIGHTS_SECTION_ORDER
    ]
    themes["3"]["source"] = SOURCE_URL
    THEMES_FILE.write_text(json.dumps(themes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Insights markdown export")
    parser.add_argument("--fetch", action="store_true", help="Fetch live page")
    args = parser.parse_args()

    if args.fetch:
        content = fetch_markdown()
    else:
        md_path = args.input or DEFAULT_MD
        if not md_path.is_file():
            print(f"Input not found: {md_path}")
            return 1
        content = md_path.read_text(encoding="utf-8")

    questions = parse_insights_markdown(content)
    restore_notes(questions)

    years = sorted({q["year"] for q in questions})
    by_year = defaultdict(int)
    for q in questions:
        by_year[q["year"]] += 1

    payload = {
        "paper": 3,
        "title": "General Studies Paper III",
        "syllabus": "Technology, Economic Development, Biodiversity, Environment, Security and Disaster Management.",
        "source": SOURCE_URL,
        "yearRange": [min(years), max(years)] if years else [2013, 2025],
        "insightsSections": INSIGHTS_SECTION_ORDER,
        "questions": sorted(questions, key=lambda q: (-q["year"], q["number"])),
    }

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    update_themes_json()

    print(f"Wrote {OUT.name}: {len(questions)} questions")
    print(f"Years {years[0]}–{years[-1]}: {dict(sorted(by_year.items()))}")
    sec_counts: dict[str, int] = defaultdict(int)
    for q in questions:
        sec_counts[q["insightsSection"]] += 1
    print("By Insights section:")
    for name in INSIGHTS_SECTION_ORDER:
        print(f"  {sec_counts[name]:3} {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
