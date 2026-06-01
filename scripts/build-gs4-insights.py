#!/usr/bin/env python3
"""
Build data/gs-paper-4.json from Insights on India subject-wise GS IV PYQ page.

Source: https://www.insightsonindia.com/upsc-mains-general-studies-4-pyq/

Usage:
  python3 scripts/build-gs4-insights.py
  python3 scripts/build-gs4-insights.py --input path/to/export.md
  python3 scripts/build-gs4-insights.py --fetch
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "gs-paper-4.json"
THEMES_FILE = ROOT / "data" / "themes.json"
DEFAULT_MD = (
    Path.home()
    / ".cursor/projects/Users-saurav-anand-Desktop-Health-upsc-mains-pyq/uploads"
    / "upsc-mains-general-studies-4-pyq-0.md"
)
SOURCE_URL = "https://www.insightsonindia.com/upsc-mains-general-studies-4-pyq/"

# Insights section → app theme mapping (first block = theory; repeated block = case studies)
SECTION_META = {
    "Ethics and Human Interface": {
        "themeId": "ethics-human-interface",
        "theme": "Ethics & Human Interface",
        "themeParent": "Ethics & Values",
    },
    "Attitude": {
        "themeId": "attitude",
        "theme": "Attitude",
        "themeParent": "Ethics & Values",
    },
    "Aptitude and Foundational Values for Civil Service": {
        "themeId": "public-service-values",
        "theme": "Public Service Values",
        "themeParent": "Public Service & Governance",
    },
    "Emotional Intelligence": {
        "themeId": "aptitude-ei",
        "theme": "Aptitude & Emotional Intelligence",
        "themeParent": "Ethics & Values",
    },
    "Contributions of Moral Thinkers and Philosophers from India and World": {
        "themeId": "thinkers-quotes",
        "theme": "Thinkers & Quotations",
        "themeParent": "Ethics & Values",
    },
    "Public/Civil Service Values and Ethics in Public Administration": {
        "themeId": "public-service-values",
        "theme": "Public Service Values",
        "themeParent": "Public Service & Governance",
    },
    "Probity in Governance": {
        "themeId": "integrity-probity",
        "theme": "Integrity & Probity",
        "themeParent": "Ethics & Values",
    },
}

CASE_SECTION_PREFIX = "Case Study:"
STOP_MARKERS = (
    "### Insights IAS",
    "### About Us",
    "#### Search Here",
    "MENUMENU",
)

INSIGHTS_SECTION_ORDER = list(SECTION_META.keys()) + [
    f"{CASE_SECTION_PREFIX} Ethics and Human Interface"
]


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
    if s.startswith(CASE_SECTION_PREFIX):
        return s
    if s in SECTION_META:
        return s
    return None


def clean_text(text: str) -> str:
    text = re.sub(r"\\(\d)", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\(\s*(\d{4})\s*\)\s*$", "", text).strip()
    text = re.sub(r"\(Answer in \d+ words\)\s*\d*\s*$", "", text, flags=re.I).strip()
    text = re.sub(r"\s+\d{4}\s+\d+\s+Migrant", " Migrant", text)
    return text


def is_case_block(section: str, occurrence: int) -> bool:
    if section.startswith(CASE_SECTION_PREFIX):
        return True
    return occurrence > 1


def detect_marks(text: str, case: bool) -> int | str:
    if case:
        return "case"
    if re.search(r"\b150\s*words\b", text, re.I):
        return 10
    if re.search(r"\b250\s*words\b", text, re.I):
        return "case"
    return 10


def insights_section_label(section: str) -> str:
    if section.startswith(CASE_SECTION_PREFIX):
        return section.replace(CASE_SECTION_PREFIX, "").strip()
    return section


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:40] or "q"


def parse_insights_markdown(content: str) -> list[dict]:
    lines = content.splitlines()
    start = 0
    for i, line in enumerate(lines):
        if line.strip() == "Ethics and Human Interface":
            start = i
            break

    section: str | None = None
    section_occurrence: dict[str, int] = defaultdict(int)
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
        if "sign in" in lower[:30]:
            return

        section_occurrence[section] += 0  # ensure key exists
        occ = section_occurrence[section]
        case = is_case_block(section, occ)
        meta = SECTION_META.get(
            insights_section_label(section) if section.startswith(CASE_SECTION_PREFIX) else section,
            SECTION_META["Ethics and Human Interface"],
        )
        if case:
            theme = "Case Study"
            theme_id = "case-study"
            theme_parent = "Case Studies"
        else:
            theme = meta["theme"]
            theme_id = meta["themeId"]
            theme_parent = meta["themeParent"]

        per_year_counter[year] += 1
        per_section_year[(section, year)] += 1
        idx = per_section_year[(section, year)]
        sec_slug = slugify(section)
        qid = f"gs4-{year}-{sec_slug}-{idx}"

        questions.append(
            {
                "id": qid,
                "year": year,
                "number": per_year_counter[year],
                "marks": detect_marks(text, case),
                "text": text,
                "theme": theme,
                "themeId": theme_id,
                "themeParent": theme_parent,
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
            if cat not in section_occurrence:
                section_occurrence[cat] = 0
            section_occurrence[cat] += 1
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
            if stripped.startswith("(") and len(stripped) < 6:
                buf.append(stripped)
            elif re.match(r"^\(\w\)", stripped):
                buf.append(stripped)
            elif stripped[0].isdigit() and ". " in stripped[:4]:
                buf.append(stripped)
            elif len(stripped) > 2:
                buf.append(stripped)

    flush()
    return questions


def load_preserved_notes() -> dict[str, dict]:
    if not OUT.is_file():
        return {}
    try:
        data = json.loads(OUT.read_text(encoding="utf-8"))
        return {q["id"]: q.get("notes", empty_notes()) for q in data.get("questions", [])}
    except Exception:
        return {}


def match_preserved_notes(old: dict[str, dict], questions: list[dict]) -> None:
    """Re-attach notes from previous JSON by fuzzy text+year match."""
    by_key: dict[tuple[int, str], dict] = {}
    for q in questions:
        key = (q["year"], q["text"][:120].lower())
        by_key[key] = q

    old_questions = []
    if OUT.is_file():
        try:
            old_questions = json.loads(OUT.read_text(encoding="utf-8")).get("questions", [])
        except Exception:
            pass

    for oq in old_questions:
        notes = oq.get("notes")
        if not notes or not any(str(v).strip() for v in notes.values()):
            continue
        key = (oq["year"], oq["text"][:120].lower())
        if key in by_key:
            by_key[key]["notes"] = notes
        elif oq["id"] in preserved:
            for q in questions:
                if q["year"] == oq.get("year") and q["text"][:80] == oq["text"][:80]:
                    q["notes"] = notes
                    break


def fetch_markdown() -> str:
    req = urllib.request.Request(
        SOURCE_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; upsc-pyq-builder/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    # Minimal HTML → text (page structure mirrors saved markdown export)
    text = re.sub(r"(?is)<script.*?>.*?</script>", "", html)
    text = re.sub(r"(?is)<style.*?>.*?</style>", "", text)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def update_themes_json(questions: list[dict]) -> None:
    with open(THEMES_FILE, encoding="utf-8") as f:
        themes = json.load(f)

    sections = []
    seen = set()
    for name in INSIGHTS_SECTION_ORDER:
        if name in seen:
            continue
        seen.add(name)
        label = insights_section_label(name) if name.startswith(CASE_SECTION_PREFIX) else name
        meta = SECTION_META.get(label, SECTION_META["Ethics and Human Interface"])
        sections.append(
            {
                "id": slugify(name),
                "name": name,
                "displayName": name,
                "themeId": "case-study" if name.startswith(CASE_SECTION_PREFIX) else meta["themeId"],
                "parent": meta["themeParent"],
            }
        )

    themes["4"]["insightsSections"] = sections
    themes["4"]["source"] = SOURCE_URL
    THEMES_FILE.write_text(json.dumps(themes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Insights page markdown export")
    parser.add_argument("--fetch", action="store_true", help="Fetch live page (HTML stripped)")
    args = parser.parse_args()

    if args.fetch:
        content = fetch_markdown()
    else:
        md_path = args.input or DEFAULT_MD
        if not md_path.is_file():
            md_path = ROOT / "data" / "sources" / "insights-gs4-pyq.md"
        if not md_path.is_file():
            print(f"Input not found: {md_path}")
            print("Save the Insights page as markdown or pass --fetch")
            return 1
        content = md_path.read_text(encoding="utf-8")

    preserved = load_preserved_notes()
    questions = parse_insights_markdown(content)
    match_preserved_notes(preserved, questions)

    years = sorted({q["year"] for q in questions})
    by_year = defaultdict(int)
    for q in questions:
        by_year[q["year"]] += 1

    payload = {
        "paper": 4,
        "title": "General Studies Paper IV",
        "syllabus": "Ethics, Integrity and Aptitude — theory and case studies.",
        "source": SOURCE_URL,
        "yearRange": [min(years), max(years)] if years else [2013, 2025],
        "themes": [
            "Ethics & Human Interface",
            "Attitude",
            "Aptitude & Emotional Intelligence",
            "Integrity & Probity",
            "Thinkers & Quotations",
            "Public Service Values",
            "Corporate & Applied Ethics",
            "Case Study",
        ],
        "insightsSections": INSIGHTS_SECTION_ORDER,
        "questions": sorted(questions, key=lambda q: (-q["year"], q["number"])),
    }

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    update_themes_json(questions)

    print(f"Wrote {OUT.name}: {len(questions)} questions")
    print(f"Years {years[0]}–{years[-1]}: {dict(sorted(by_year.items()))}")
    print(f"By section:")
    sec_counts: dict[str, int] = defaultdict(int)
    for q in questions:
        sec_counts[q["insightsSection"]] += 1
    for name, n in sec_counts.items():
        print(f"  {name}: {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
