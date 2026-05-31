#!/usr/bin/env python3
"""
Build GS Paper I–IV JSON (2013–2025): questions only + theme + empty note slots.
Does NOT fetch or generate answers — fill notes in the app or JSON.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_STAR = Path(__file__).resolve().parent / "upsc-star-source.json"
THEMES_FILE = ROOT / "data" / "themes.json"
SOURCES_DIR = ROOT / "data" / "sources"
OUT_DIR = ROOT / "data"

PAPER_MAP = {"GSI": 1, "GSII": 2, "GSIII": 3, "GSIV": 4}

META = {
    1: {
        "title": "General Studies Paper I",
        "syllabus": "Indian Heritage and Culture, History and Geography of the World and Society.",
    },
    2: {
        "title": "General Studies Paper II",
        "syllabus": "Governance, Constitution, Polity, Social Justice and International relations.",
    },
    3: {
        "title": "General Studies Paper III",
        "syllabus": "Technology, Economic Development, Biodiversity, Environment, Security and Disaster Management.",
    },
    4: {
        "title": "General Studies Paper IV",
        "syllabus": "Ethics, Integrity and Aptitude — theory and case studies.",
    },
}

THEME_CONFIG: dict = {}


def load_theme_config() -> None:
    global THEME_CONFIG
    with open(THEMES_FILE, encoding="utf-8") as f:
        THEME_CONFIG = json.load(f)


def empty_notes() -> dict:
    return {
        "introduction": "",
        "staticNotes": "",
        "quotes": "",
        "currentAffairs": "",
        "topperPoints": "",
        "valueMaterial": "",
    }


def classify_theme(text: str, paper: int, marks: int | str) -> dict:
    """Return primary theme + subthemes from syllabus-aligned keyword scoring."""
    cfg = THEME_CONFIG.get(str(paper), {})
    themes = cfg.get("themes", [])
    lower = text.lower()

    if paper == 4 and marks == "case":
        case = next((t for t in themes if t["id"] == "case-study"), None)
        if case:
            return {"theme": case["name"], "themeId": case["id"], "subthemes": []}

    scores: list[tuple[int, dict]] = []
    for t in themes:
        score = 0
        for kw in t["keywords"].split():
            if len(kw) < 3:
                continue
            if kw in lower:
                score += 2 if len(kw) > 6 else 1
        if score:
            scores.append((score, t))

    scores.sort(key=lambda x: -x[0])
    if scores:
        primary = scores[0][1]
        sub = [s[1]["name"] for s in scores[1:3] if s[0] >= scores[0][0] // 2]
        return {
            "theme": primary["name"],
            "themeId": primary["id"],
            "themeParent": primary.get("parent", ""),
            "subthemes": sub,
        }

    fallback = {
        1: "Indian Society",
        2: "Governance & Administration",
        3: "Economy & Development",
        4: "Ethics & Human Interface",
    }
    return {
        "theme": fallback.get(paper, "General"),
        "themeId": "misc",
        "themeParent": "",
        "subthemes": [],
    }


def clearias_urls(paper: int, year: int) -> list[str]:
    urls = [
        f"https://www.clearias.com/gs-paper-{paper}-upsc-{year}-mains-question-paper-and-analysis/",
        f"https://www.clearias.com/gs-paper-{paper}-upsc-{year}-mains/",
        f"https://www.clearias.com/general-studies-paper-{paper}-upsc-main-exam-{year}/",
        f"https://www.clearias.com/upsc-cse-mains-{year}-general-studies-{paper}-gs-{paper}-question-paper/",
        f"https://www.clearias.com/upsc-mains-{year}-download-general-studies-paper-{paper}-gs{paper}-question-paper/",
    ]
    if paper == 1 and year == 2018:
        urls.insert(
            0,
            "https://www.clearias.com/upsc-mains-2018-download-general-studies-paper-1-gs1-question-paper/",
        )
    if paper == 4:
        urls.insert(
            0,
            f"https://www.clearias.com/upsc-cse-mains-{year}-general-studies-4-gs-4-question-paper/",
        )
    if paper == 1 and year in (2013, 2014):
        urls.insert(
            0,
            f"https://www.clearias.com/upsc-cse-mains-{year}-general-studies-1-gs-1-question-paper/",
        )
    return urls


def is_valid_question(text: str, paper: int) -> bool:
    lower = text.lower()
    if len(text) < 25:
        return False
    if "time allowed: three hours" in lower or "question-cum-answer" in lower[:200]:
        return False
    if "csat" in lower[:50] or "preliminary exam" in lower:
        return False
    word_markers = len(re.findall(r"\(\s*150\s*words", text, re.I))
    word_markers += len(re.findall(r"\(\s*250\s*words", text, re.I))
    if word_markers > 2:
        return False
    max_len = 6000 if paper == 4 else 900
    if len(text) > max_len:
        return False
    return True


def clean_question(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s*\(Answer in \d+ words\)\s*", " ", text, flags=re.I)
    text = re.sub(r"\s*\d+\s*marks?\s*$", "", text, flags=re.I)
    text = re.sub(r"\s*\d+\s*mark\s*$", "", text, flags=re.I)
    return text.strip()


def parse_marks(raw, text: str) -> int | str:
    if raw is not None:
        if isinstance(raw, str) and "case" in raw.lower():
            return "case"
        try:
            return int(raw)
        except (TypeError, ValueError):
            pass
    lower = text.lower()
    if re.search(r"\b20\s*marks?\b", text, re.I) or (
        "case" in lower and len(text) > 280
    ):
        if len(text) > 350 or re.search(
            r"\byou are\b|\bdistrict magistrate\b|\boptions available\b",
            lower,
        ):
            return "case"
    m = re.search(r"\b(10|15|20)\s*marks?\b", text, re.I)
    if m:
        v = int(m.group(1))
        return "case" if v == 20 and len(text) > 350 else v
    return 10


def question_id(paper: int, year: int, number: int | str) -> str:
    num = str(number).replace(".", "-")
    return f"gs{paper}-{year}-q{num}"


def normalize_entry(
    paper: int,
    year: int,
    number: int | str,
    text: str,
    marks: int | str | None = None,
    preserved_notes: dict | None = None,
) -> dict:
    text = clean_question(text)
    if not is_valid_question(text, paper):
        return None
    m = parse_marks(marks, text)
    theme_info = classify_theme(text, paper, m)
    qid = question_id(paper, year, number)
    notes = preserved_notes.get(qid, empty_notes()) if preserved_notes else empty_notes()
    if preserved_notes and qid not in preserved_notes:
        notes = empty_notes()

    return {
        "id": qid,
        "year": year,
        "number": number,
        "marks": m,
        "text": text,
        "theme": theme_info["theme"],
        "themeId": theme_info["themeId"],
        "themeParent": theme_info.get("themeParent", ""),
        "subthemes": theme_info["subthemes"],
        "notes": notes,
    }


def load_preserved_notes() -> dict[str, dict]:
    """Keep user-written notes when rebuilding question bank."""
    out: dict[str, dict] = {}
    for paper in range(1, 5):
        path = OUT_DIR / f"gs-paper-{paper}.json"
        if not path.exists():
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for q in data.get("questions", []):
            notes = q.get("notes")
            if not notes and q.get("study"):
                continue
            if notes and any(str(v).strip() for v in notes.values()):
                out[q["id"]] = notes
    return out


def load_star(preserved: dict[str, dict]) -> dict[int, list[dict]]:
    if not SOURCE_STAR.exists():
        print(f"Missing {SOURCE_STAR}")
        return {1: [], 2: [], 3: [], 4: []}

    with open(SOURCE_STAR, encoding="utf-8") as f:
        raw = json.load(f)

    by_paper: dict[int, list[dict]] = {1: [], 2: [], 3: [], 4: []}
    year_counters: dict[tuple[int, int], int] = {}

    for key, items in raw.items():
        paper = PAPER_MAP.get(key)
        if not paper:
            continue
        for item in items:
            year = int(item["Year"])
            year_counters[(paper, year)] = year_counters.get((paper, year), 0) + 1
            num = year_counters[(paper, year)]
            entry = normalize_entry(
                paper, year, num, item["Question"], item.get("Marks"), preserved
            )
            if entry:
                by_paper[paper].append(entry)
    return by_paper


def load_local_supplements(preserved: dict[str, dict]) -> dict[int, list[dict]]:
    by_paper: dict[int, list[dict]] = {1: [], 2: [], 3: [], 4: []}
    if not SOURCES_DIR.exists():
        return by_paper
    for path in sorted(SOURCES_DIR.glob("*.json")):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        if "papers" in data:
            for pkey, items in data["papers"].items():
                paper = int(pkey)
                for item in items:
                    entry = normalize_entry(
                        paper,
                        int(item["year"]),
                        item.get("number", item.get("num", 0)),
                        item["text"],
                        item.get("marks"),
                        preserved,
                    )
                    if entry:
                        by_paper[paper].append(entry)
            continue

        paper = int(data.get("paper", 0))
        if paper not in by_paper:
            continue
        for item in data.get("questions", []):
            entry = normalize_entry(
                paper,
                int(item["year"]),
                item.get("number", item.get("num", 0)),
                item["text"],
                item.get("marks"),
                preserved,
            )
            if entry:
                by_paper[paper].append(entry)
    return by_paper


def strip_html(html: str) -> str:
    html = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.I | re.S)
    html = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.I | re.S)
    html = re.sub(r"<[^>]+>", " ", html)
    html = re.sub(r"&nbsp;|&amp;|&quot;|&#\d+;", " ", html)
    return re.sub(r"\s+", " ", html)


def extract_questions_from_text(
    text: str, paper: int, year: int, preserved: dict[str, dict]
) -> list[dict]:
    text = strip_html(text)
    patterns = [
        re.compile(
            r"Q\s*n?\s*(\d+[a-z]?)\s*[:.)]\s*(.+?)(?=Q\s*n?\s*\d+[a-z]?\s*[:.)]|Q\s*\d+\s*\.|SECTION\s*[-–]|##\s|Toggle|Related Posts|$)",
            re.I | re.S,
        ),
        re.compile(
            r"(\d+)\)\s+(.+?)(?=\d+\)\s+|SECTION\s*[-–]|##\s|ANALYSIS|Related Posts|$)",
            re.I | re.S,
        ),
        re.compile(
            r"(\d+)\.\s+(.+?)(?=\d+\.\s+|SECTION\s*[-–]|##\s|Related Posts|$)",
            re.I | re.S,
        ),
    ]
    results = []
    seen = set()

    for pattern in patterns:
        for match in pattern.finditer(text):
            num_raw = match.group(1)
            body = clean_question(match.group(2))
            if len(body) < 25 or "prelims" in body.lower()[:80]:
                continue
            if "csat" in body.lower()[:40]:
                continue
            if pattern.pattern.startswith("(\\d+)"):
                if not re.search(
                    r"\b(150|250)\s*words?\b|\b\d+\s*marks?\b|\?|examine|discuss|explain",
                    body,
                    re.I,
                ):
                    continue
            key = (num_raw, body[:80])
            if key in seen:
                continue
            seen.add(key)
            num: int | str = int(num_raw) if num_raw.isdigit() else num_raw
            entry = normalize_entry(paper, year, num, body, None, preserved)
            if entry:
                results.append(entry)

    return results


def fetch_clearias(
    paper: int, year: int, preserved: dict[str, dict]
) -> list[dict]:
    for url in clearias_urls(paper, year):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "Mozilla/5.0 (upsc-pyq-builder/1.0)"}
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                html = resp.read().decode("utf-8", errors="replace")
            results = extract_questions_from_text(html, paper, year, preserved)
            if len(results) >= 5 or (paper == 4 and len(results) >= 3):
                return results
        except Exception:
            continue
    return []


def paper_from_id(qid: str) -> int:
    m = re.match(r"gs(\d)-", qid or "")
    return int(m.group(1)) if m else 1


def merge_questions(existing: list[dict], new_items: list[dict]) -> list[dict]:
    index: dict[tuple, dict] = {}
    for q in existing + new_items:
        if not q:
            continue
        p = paper_from_id(q.get("id", ""))
        if not is_valid_question(q.get("text", ""), p):
            continue
        key = (q["year"], str(q["number"]))
        if key not in index or len(q["text"]) > len(index[key]["text"]):
            old_notes = index.get(key, {}).get("notes")
            if key in index and old_notes and any(str(v).strip() for v in old_notes.values()):
                q = {**q, "notes": old_notes}
            index[key] = q
    merged = list(index.values())
    merged.sort(
        key=lambda x: (-x["year"], str(x["number"])),
    )
    return merged


def print_theme_summary(paper: int, questions: list[dict]) -> None:
    from collections import Counter

    c = Counter(q["theme"] for q in questions)
    print(f"  Themes GS{paper}: {dict(c.most_common(6))}")


def build(fetch_clearias_years: bool = True) -> None:
    load_theme_config()
    preserved = load_preserved_notes()
    if preserved:
        print(f"Preserving notes for {len(preserved)} questions")

    print("Loading UPSC-Star…")
    by_paper = load_star(preserved)
    print("Loading local supplements…")
    supp = load_local_supplements(preserved)
    for p in range(1, 5):
        by_paper[p] = merge_questions(by_paper.get(p, []), supp.get(p, []))

    if fetch_clearias_years:
        print("Fetching ClearIAS (2013–2025)…")
        for paper in range(1, 5):
            for year in range(2013, 2026):
                fetched = fetch_clearias(paper, year, preserved)
                if fetched:
                    print(f"  GS{paper} {year}: +{len(fetched)} questions")
                    by_paper[paper] = merge_questions(by_paper[paper], fetched)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for paper in range(1, 5):
        meta = META[paper]
        themes_list = THEME_CONFIG[str(paper)]["themes"]
        out = {
            "paper": paper,
            "title": meta["title"],
            "syllabus": meta["syllabus"],
            "yearRange": [2013, 2025],
            "themes": [t["name"] for t in themes_list],
            "questions": by_paper[paper],
        }
        path = OUT_DIR / f"gs-paper-{paper}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        years = sorted({q["year"] for q in out["questions"]})
        print(
            f"Wrote {path.name}: {len(out['questions'])} Qs, "
            f"years {years[0] if years else '—'}–{years[-1] if years else '—'}"
        )
        print_theme_summary(paper, out["questions"])


if __name__ == "__main__":
    fetch = "--no-fetch" not in sys.argv
    build(fetch_clearias_years=fetch)
