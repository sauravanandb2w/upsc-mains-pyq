#!/usr/bin/env python3
"""
Fetch UPSC Civil Services (Main) Mathematics Optional PDFs from upsc.gov.in,
OCR with tesseract, parse questions, classify by module, write JSON.

Requires: tesseract, pdftoppm (poppler), pypdf — see scripts/requirements.txt

Usage:
  python3 scripts/fetch-math-pyq.py
  python3 scripts/fetch-math-pyq.py --no-fetch      # reuse cached PDFs
  python3 scripts/fetch-math-pyq.py --year 2024     # single year
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(__file__).resolve().parent.parent
MODULES_FILE = ROOT / "data" / "math-modules.json"
PDF_CACHE = ROOT / "data" / "sources" / "math-pdfs"
INDEX_FILE = ROOT / "data" / "sources" / "math-pdf-index.json"
OUT_P1 = ROOT / "data" / "math-paper-1.json"
OUT_P2 = ROOT / "data" / "math-paper-2.json"

BASE_URL = "https://www.upsc.gov.in"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

PAPER_META = {
    1: {
        "paper": 5,
        "title": "Mathematics Optional — Paper I",
        "syllabus": "Linear Algebra · Calculus · Analytic Geometry · ODE · Dynamics & Statics · Vector Analysis",
    },
    2: {
        "paper": 6,
        "title": "Mathematics Optional — Paper II",
        "syllabus": "Algebra · Real Analysis · Complex Analysis · Linear Programming · PDE · Numerical Analysis · Mechanics & Fluid Dynamics",
    },
}


def load_module_config() -> dict:
    with open(MODULES_FILE, encoding="utf-8") as f:
        return json.load(f)


def empty_notes() -> dict:
    return {
        "introduction": "",
        "staticNotes": "",
        "quotes": "",
        "currentAffairs": "",
        "topperPoints": "",
        "valueMaterial": "",
    }


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8", "replace")


def download_pdf(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Encode filename (spaces in e.g. Mathematics Paper-I.pdf)
    if "/sites/default/files/" in url:
        base, fname = url.rsplit("/", 1)
        url = base + "/" + quote(fname, safe="")

    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = resp.read()
        if not data.startswith(b"%PDF"):
            return False
        dest.write_bytes(data)
        return True
    except Exception:
        return False


def paper_num_from_path(path: str) -> int | None:
    p = unquote(path).upper()
    if re.search(r"PAPER\s*-?\s*II\b|PAPER\s+II\b|MATHEMATICS-II|MATHEMATICS_II\b|MATHEMATICS II\b", p):
        return 2
    if re.search(r"PAPER\s*-?\s*I\b|PAPER\s+I\b|MATHEMATICS-I\b|MATHEMATICS_I\b|MATHEMATICS I\b", p):
        return 1
    return None


def is_csm_math_path(path: str) -> bool:
    p = unquote(path).upper()
    if "MATHE" not in p:
        return False
    if any(x in p for x in ("NDA", "CDS", "IFSM", "ELEMENTARY", "ELEM_", "NDANA")):
        return False
    return True


def discover_pdfs_by_year() -> dict[int, dict[int, str]]:
    """Return {year: {1: url, 2: url}} from official UPSC examination pages."""
    by_year: dict[int, dict[int, str]] = {}

    for year in range(2013, 2026):
        page = f"{BASE_URL}/examinations/Civil%20Services%20%28Main%29%20Examination%2C%20{year}"
        try:
            html = fetch_html(page)
        except Exception:
            continue

        for raw in re.findall(r"/sites/default/files/[^\"\s<>]+?\.pdf", html, re.I):
            path = unquote(raw)
            if not is_csm_math_path(path):
                continue
            num = paper_num_from_path(path)
            if not num:
                continue
            by_year.setdefault(year, {})[num] = BASE_URL + path

    # Supplement from civil-services listing (recent years)
    try:
        html = fetch_html(
            f"{BASE_URL}/examinations/previous-question-papers?field_exam_name_value=civil+services"
        )
        for raw in re.findall(r"/sites/default/files/[^\"\s<>]+?\.pdf", html, re.I):
            path = unquote(raw)
            if not is_csm_math_path(path):
                continue
            if "CSM" not in path.upper() and "QP-CSM" not in path.upper():
                continue
            num = paper_num_from_path(path)
            if not num:
                continue
            m = re.search(r"CSM[-_]?(\d{2,4})", path.upper())
            if m:
                yy = m.group(1)
                year = int(yy) if len(yy) == 4 else 2000 + int(yy)
            elif "CSM19" in path.upper():
                year = 2019
            elif "CSM-25" in path.upper() or "CSM25" in path.upper():
                year = 2025
            else:
                continue
            by_year.setdefault(year, {})[num] = BASE_URL + path
    except Exception:
        pass

    return by_year


def ocr_pdf(pdf_path: Path) -> str:
    tesseract = shutil.which("tesseract")
    pdftoppm = shutil.which("pdftoppm")
    if not tesseract or not pdftoppm:
        raise RuntimeError("Install tesseract and poppler (pdftoppm). macOS: brew install tesseract poppler")

    with tempfile.TemporaryDirectory(prefix="math-ocr-") as tmp:
        tmp_path = Path(tmp)
        prefix = tmp_path / "page"
        subprocess.run(
            [pdftoppm, "-png", str(pdf_path), str(prefix)],
            check=True,
            capture_output=True,
        )
        parts = []
        for img in sorted(tmp_path.glob("page-*.png")):
            result = subprocess.run(
                [tesseract, str(img), "stdout", "-l", "eng", "--psm", "6"],
                check=True,
                capture_output=True,
                text=True,
            )
            parts.append(result.stdout)
        return "\n\n".join(parts)


def english_ratio(line: str) -> float:
    if not line.strip():
        return 0.0
    letters = len(re.findall(r"[A-Za-z]", line))
    return letters / max(len(line.strip()), 1)


def clean_ocr_text(text: str) -> str:
    lines = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            lines.append("")
            continue
        # Always keep structural / question lines
        if re.match(r"^\d+\.", s):
            lines.append(s)
            continue
        if re.match(r"^\d+\.\([a-e]\)", s, re.I):
            lines.append(s)
            continue
        if re.match(r"^\([a-e]\)", s, re.I):
            lines.append(s)
            continue
        if re.match(r"^SECTION", s, re.I):
            lines.append(s)
            continue
        if english_ratio(s) >= 0.35:
            lines.append(s)
        elif re.match(r"^[\d\.\(\)\[\]\s\-–—]+$", s):
            lines.append(s)
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def default_section(qnum: int) -> str:
    """UPSC Math papers: Q1–4 Section A, Q5–8 Section B."""
    return "A" if qnum <= 4 else "B"


def detect_section_headers(text: str) -> list[tuple[int, str]]:
    """Return list of (position, 'A'|'B') for section headers."""
    headers = []
    for m in re.finditer(r"(?mi)^SECTION\s*[—\-–]?\s*([AB])\b", text):
        headers.append((m.start(), m.group(1).upper()))
    return headers


def section_for_pos(headers: list[tuple[int, str]], pos: int) -> str:
    sec = "A"
    for hpos, label in headers:
        if hpos <= pos:
            sec = label
        else:
            break
    return sec


def extract_marks(block: str) -> int | None:
    trailing = re.findall(r"(?m)^(\d{1,2})\s*$", block)
    vals = [int(x) for x in trailing if 5 <= int(x) <= 50]
    if 1 <= len(vals) <= 8:
        return sum(vals)
    m = re.search(r"(?i)(\d{1,2})\s*marks?", block)
    if m:
        return int(m.group(1))
    return None


def normalize_question_numbers(text: str) -> str:
    """Fix common OCR misreads of question numbers (Q1, Ql, etc.)."""
    text = re.sub(r"(?m)^Q([1-8])\.", r"\1.", text)
    text = re.sub(r"(?m)^Ql\.", "1.", text)
    text = re.sub(r"(?m)^Q([1-8])\s*\.", r"\1.", text)
    text = re.sub(r"(?m)^O([1-8])\.", r"\1.", text)
    return text


QUESTION_START = re.compile(
    r"(?m)^([1-8])\.(?:\s|\s*\([a-e]\)\s*)(?=[A-Za-z\"'(\[])",
    re.IGNORECASE,
)


def parse_questions(text: str) -> list[dict]:
    text = normalize_question_numbers(clean_ocr_text(text))

    matches = list(QUESTION_START.finditer(text))
    if not matches:
        return []

    questions = []
    for i, m in enumerate(matches):
        qnum = int(m.group(1))
        if qnum < 1 or qnum > 8:
            continue
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        block = re.sub(r"(?m)^PHKM[^\n]*$", "", block).strip()
        block = re.sub(r"(?m)^\[\s*P\.T\.O\.\s*\]$", "", block).strip()
        if len(block) < 30:
            continue

        section = default_section(qnum)
        marks = extract_marks(block)
        questions.append(
            {
                "number": qnum,
                "section": section,
                "marks": marks if marks else 20,
                "text": block,
            }
        )

    # Deduplicate by question number (OCR sometimes repeats)
    seen: set[int] = set()
    unique = []
    for q in sorted(questions, key=lambda x: x["number"]):
        if q["number"] in seen:
            continue
        seen.add(q["number"])
        unique.append(q)
    return unique


def keyword_matches(keyword: str, text: str) -> bool:
    if len(keyword) < 5:
        return bool(re.search(r"\b" + re.escape(keyword) + r"\b", text))
    return keyword in text


def classify_module(text: str, paper_num: int, modules: list[dict]) -> dict:
    lower = text.lower()
    scores: list[tuple[int, dict]] = []
    for mod in modules:
        score = 0
        for kw in mod["keywords"].split():
            if len(kw) < 3:
                continue
            if keyword_matches(kw, lower):
                score += 2 if len(kw) > 6 else 1
        if score:
            scores.append((score, mod))
    scores.sort(key=lambda x: -x[0])
    if scores:
        m = scores[0][1]
        return {"moduleId": m["id"], "module": m["name"], "themeId": m["id"], "theme": m["name"]}
    fallback = modules[0] if modules else {"id": "misc", "name": "General"}
    return {
        "moduleId": fallback["id"],
        "module": fallback["name"],
        "themeId": fallback["id"],
        "theme": fallback["name"],
    }


def normalize_entry(paper_json_num: int, year: int, q: dict, modules: list[dict], pdf_url: str) -> dict:
    mod = classify_module(q["text"], paper_json_num, modules)
    qid = f"math{paper_json_num}-{year}-q{q['number']}"
    return {
        "id": qid,
        "year": year,
        "number": q["number"],
        "section": q["section"],
        "marks": q["marks"],
        "text": q["text"],
        "moduleId": mod["moduleId"],
        "module": mod["module"],
        "themeId": mod["themeId"],
        "theme": mod["theme"],
        "subthemes": [],
        "sourcePdf": pdf_url,
        "notes": empty_notes(),
    }


def load_preserved_notes(path: Path) -> dict[str, dict]:
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return {q["id"]: q.get("notes", empty_notes()) for q in data.get("questions", [])}
    except Exception:
        return {}


def write_paper_json(path: Path, paper_json_num: int, questions: list[dict]) -> None:
    meta = PAPER_META[paper_json_num]
    preserved = load_preserved_notes(path)
    for q in questions:
        if q["id"] in preserved:
            q["notes"] = preserved[q["id"]]

    years = sorted({q["year"] for q in questions})
    payload = {
        "paper": meta["paper"],
        "subject": "math",
        "title": meta["title"],
        "syllabus": meta["syllabus"],
        "yearRange": [2013, 2025],
        "sections": ["A", "B"],
        "source": "upsc.gov.in (OCR from official PDFs — verify text before exam use)",
        "questions": sorted(
            questions,
            key=lambda q: (-q["year"], q["number"]),
        ),
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {path.name}: {len(questions)} questions, years {years}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-fetch", action="store_true", help="Use cached PDFs only")
    parser.add_argument("--year", type=int, help="Process a single year")
    args = parser.parse_args()

    module_cfg = load_module_config()
    modules_p1 = module_cfg["5"]["themes"]
    modules_p2 = module_cfg["6"]["themes"]

    pdf_map = discover_pdfs_by_year()
    if args.year:
        pdf_map = {args.year: pdf_map.get(args.year, {})}

    index = {"discoveredAt": __import__("datetime").date.today().isoformat(), "years": {}}
    all_q1: list[dict] = []
    all_q2: list[dict] = []

    for year in sorted(pdf_map.keys()):
        urls = pdf_map[year]
        index["years"][str(year)] = urls
        print(f"\n=== {year} ===")

        for paper_num in (1, 2):
            url = urls.get(paper_num)
            if not url:
                print(f"  Paper {paper_num}: not on upsc.gov.in")
                continue

            fname = unquote(url.split("/")[-1]).replace(" ", "_")
            cache_path = PDF_CACHE / str(year) / f"paper-{paper_num}-{fname}"

            if not cache_path.is_file():
                if args.no_fetch:
                    print(f"  Paper {paper_num}: missing cache {cache_path}")
                    continue
                print(f"  Downloading Paper {paper_num}…")
                if not download_pdf(url, cache_path):
                    print(f"  Paper {paper_num}: download failed")
                    continue
            else:
                print(f"  Paper {paper_num}: cached")

            print(f"  OCR Paper {paper_num}…")
            try:
                ocr_text = ocr_pdf(cache_path)
            except Exception as exc:
                print(f"  OCR failed: {exc}")
                continue

            parsed = parse_questions(ocr_text)
            modules = modules_p1 if paper_num == 1 else modules_p2
            entries = [normalize_entry(paper_num, year, q, modules, url) for q in parsed]
            print(f"  Parsed {len(entries)} questions (Paper {paper_num})")
            if paper_num == 1:
                all_q1.extend(entries)
            else:
                all_q2.extend(entries)

    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    INDEX_FILE.write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")

    write_paper_json(OUT_P1, 1, all_q1)
    write_paper_json(OUT_P2, 2, all_q2)

    missing_years = [y for y in range(2013, 2026) if str(y) not in index["years"] or len(index["years"][str(y)]) < 2]
    if missing_years:
        print(f"\nNot available on upsc.gov.in (both papers): {missing_years}")

    print("\nDone. Verify OCR text against official PDFs before relying on it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
