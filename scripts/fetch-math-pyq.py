#!/usr/bin/env python3
"""
Fetch UPSC Mathematics Optional PDFs from upsc.gov.in and build question entries
as **PDF scan cutouts** (PNG/JPG per question) — no garbled OCR question text.

Requires: poppler (pdftoppm), tesseract, Pillow

Usage:
  python3 scripts/fetch-math-pyq.py
  python3 scripts/fetch-math-pyq.py --no-fetch
  python3 scripts/fetch-math-pyq.py --year 2024
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import shutil
import subprocess
import sys
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, unquote

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MODULES_FILE = ROOT / "data" / "math-modules.json"
PDF_CACHE = ROOT / "data" / "sources" / "math-pdfs"
INDEX_FILE = ROOT / "data" / "sources" / "math-pdf-index.json"
STUDY_QUESTIONS = ROOT / "study" / "questions"
OUT_P1 = ROOT / "data" / "math-paper-1.json"
OUT_P2 = ROOT / "data" / "math-paper-2.json"

BASE_URL = "https://www.upsc.gov.in"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
RENDER_DPI = 150
JPEG_QUALITY = 88

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

Q_MARKER = re.compile(r"^(?:Q|O)?([1-8])\.?$|^Ql\.?$", re.I)
_TSV_CACHE: dict[str, list[dict]] = {}


@dataclass
class Anchor:
    page: int
    top: int
    qnum: int


@dataclass
class CropSlice:
    page: int
    top: int
    bottom: int


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


def default_section(qnum: int) -> str:
    return "A" if qnum <= 4 else "B"


def render_pdf_pages(pdf_path: Path, out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    pdftoppm = shutil.which("pdftoppm")
    if not pdftoppm:
        raise RuntimeError("pdftoppm not found — install poppler")

    prefix = out_dir / "page"
    subprocess.run(
        [pdftoppm, "-png", "-r", str(RENDER_DPI), str(pdf_path), str(prefix)],
        check=True,
        capture_output=True,
    )
    pages = sorted(out_dir.glob("page-*.png"))
    if not pages:
        raise RuntimeError(f"No pages rendered from {pdf_path}")
    return pages


def tesseract_tsv(image_path: Path) -> list[dict]:
    key = str(image_path.resolve())
    if key in _TSV_CACHE:
        return _TSV_CACHE[key]

    tesseract = shutil.which("tesseract")
    if not tesseract:
        raise RuntimeError("tesseract not found")

    proc = subprocess.run(
        [tesseract, str(image_path), "stdout", "-l", "eng", "--psm", "6", "tsv"],
        check=False,
        capture_output=True,
    )
    stdout = proc.stdout.decode("utf-8", errors="replace")
    if proc.returncode != 0 and not stdout.strip():
        _TSV_CACHE[key] = []
        return []

    reader = csv.DictReader(io.StringIO(stdout), delimiter="\t")
    rows = []
    for row in reader:
        try:
            rows.append(
                {
                    "level": int(row["level"]),
                    "text": (row["text"] or "").strip(),
                    "left": int(float(row["left"])),
                    "top": int(float(row["top"])),
                    "width": int(float(row["width"])),
                    "height": int(float(row["height"])),
                    "conf": int(float(row["conf"])) if row["conf"] != "-1" else -1,
                }
            )
        except (KeyError, ValueError):
            continue
    _TSV_CACHE[key] = rows
    return rows


def clear_tsv_cache() -> None:
    _TSV_CACHE.clear()


def parse_qnum(token: str) -> int | None:
    token = token.strip()
    if token.lower() == "ql.":
        return 1
    m = re.match(r"^(?:Q|O)?([1-8])\.?$", token, re.I)
    if m:
        return int(m.group(1))
    return None


def page_text(page_path: Path) -> str:
    rows = tesseract_tsv(page_path)
    return " ".join(r["text"] for r in rows if r["text"])


def is_instructions_page(page_path: Path) -> bool:
    text = page_text(page_path).upper()
    if "SPECIFIC INSTRUCTION" in text or "QUESTION PAPER SPECIFIC" in text:
        return True
    if "EIGHT QUESTION" in text and "COMPULSORY" in text:
        return True
    if "INSTRUCTION" in text and "COMPULSORY" in text and "SECTION" not in text:
        return True
    return False


def find_content_start_page(page_paths: list[Path]) -> int:
    for idx, page_path in enumerate(page_paths):
        text = page_text(page_path).upper()
        if "SECTION" in text and re.search(r"SECTION[^A-Z]*A\b|SECTION—A|SECTION-A", text):
            return idx
    for idx, page_path in enumerate(page_paths):
        if not is_instructions_page(page_path):
            return idx
    return 1 if len(page_paths) > 1 else 0


def looks_like_question_line(joined: str) -> bool:
    """Real PYQ lines start like '1. (a)' not instruction bullets."""
    compact = re.sub(r"\s+", " ", joined.strip())
    if re.match(r"^[1-8]\.\s*\([a-eA-E]\)", compact):
        return True
    if re.match(r"^Q?[1-8]\.\s*\([a-eA-E]\)", compact, re.I):
        return True
    return False


def looks_like_question_line_loose(joined: str, *, page_idx: int, content_start: int) -> bool:
    compact = re.sub(r"\s+", " ", joined.strip())
    if not re.match(r"^[1-8]\.", compact):
        return False
    upper = compact.upper()
    if any(w in upper for w in ("COMPULSORY", "INSTRUCTION", "EIGHT QUESTION", "CANDIDATE", "THERE ARE")):
        return False
    if page_idx == content_start and re.match(r"^1\.", compact) and not re.search(r"\([a-eA-E]\)", compact):
        return False
    return len(compact) > 12


def collect_anchors_on_page(
    page_idx: int,
    page_path: Path,
    seen: set[int],
    *,
    strict: bool,
    content_start: int,
) -> list[Anchor]:
    found: list[Anchor] = []
    img = Image.open(page_path)
    width = img.width
    rows = tesseract_tsv(page_path)

    line_words: dict[int, list[dict]] = {}
    for row in rows:
        if row["level"] not in (4, 5) or not row["text"]:
            continue
        if row["conf"] >= 0 and row["conf"] < 20:
            continue
        if row["left"] > width * 0.28:
            continue
        bucket = row["top"] // 10
        line_words.setdefault(bucket, []).append(row)

    for bucket in sorted(line_words.keys()):
        words = sorted(line_words[bucket], key=lambda w: w["left"])
        joined = " ".join(w["text"] for w in words)
        ok = (
            looks_like_question_line(joined)
            if strict
            else looks_like_question_line_loose(joined, page_idx=page_idx, content_start=content_start)
        )
        if not ok:
            continue
        first = words[0]["text"]
        qnum = parse_qnum(first) or parse_qnum(joined.split()[0] if joined else "")
        if not qnum or qnum in seen:
            continue
        seen.add(qnum)
        found.append(Anchor(page=page_idx, top=words[0]["top"], qnum=qnum))
    return found


def find_anchors(page_paths: list[Path]) -> list[Anchor]:
    """Find question-number anchors on the left margin of each page."""
    content_start = find_content_start_page(page_paths)
    anchors: list[Anchor] = []
    seen: set[int] = set()

    for page_idx, page_path in enumerate(page_paths):
        if page_idx < content_start:
            continue
        if is_instructions_page(page_path):
            continue
        anchors.extend(
            collect_anchors_on_page(
                page_idx, page_path, seen, strict=True, content_start=content_start
            )
        )

    if len(anchors) < 6:
        seen = {a.qnum for a in anchors}
        for page_idx, page_path in enumerate(page_paths):
            if page_idx < content_start:
                continue
            if is_instructions_page(page_path):
                continue
            anchors.extend(
                collect_anchors_on_page(
                    page_idx, page_path, seen, strict=False, content_start=content_start
                )
            )

    anchors.sort(key=lambda a: (a.page, a.top))
    return anchors


def find_section_b_page(page_paths: list[Path], content_start: int) -> int | None:
    for page_idx in range(content_start, len(page_paths)):
        text = page_text(page_paths[page_idx]).upper()
        if re.search(r"SECTION[^A-Z]*B\b|SECTION—B|SECTION-B|SECTION — B", text):
            return page_idx
    return None


def content_page_indices(page_paths: list[Path], content_start: int) -> list[int]:
    indices: list[int] = []
    for page_idx in range(content_start, len(page_paths)):
        if is_instructions_page(page_paths[page_idx]):
            continue
        indices.append(page_idx)
    return indices


def chunk_pages_to_questions(pages: list[int], q_start: int, q_count: int) -> dict[int, list[CropSlice]]:
    if not pages:
        return {}
    out: dict[int, list[CropSlice]] = {}
    per = max(1, len(pages) // q_count)
    for offset in range(q_count):
        qnum = q_start + offset
        start = offset * per
        end = len(pages) if offset == q_count - 1 else (offset + 1) * per
        out[qnum] = [CropSlice(page=p, top=0, bottom=10_000) for p in pages[start:end]]
    return out


def build_page_fallback_slices(page_paths: list[Path], content_start: int) -> dict[int, list[CropSlice]]:
    """When OCR anchors fail, split content pages evenly across Q1–8."""
    pages = content_page_indices(page_paths, content_start)
    if not pages:
        return {}

    section_b = find_section_b_page(page_paths, content_start)
    if section_b is None:
        mid = max(1, len(pages) // 2)
        part_a = pages[:mid]
        part_b = pages[mid:]
    else:
        part_a = [p for p in pages if p < section_b]
        part_b = [p for p in pages if p >= section_b]

    slices: dict[int, list[CropSlice]] = {}
    slices.update(chunk_pages_to_questions(part_a, 1, 4))
    slices.update(chunk_pages_to_questions(part_b, 5, 4))
    return slices


def build_slices(anchors: list[Anchor], page_count: int) -> dict[int, list[CropSlice]]:
    """Map question number -> vertical slices (may span pages)."""
    if not anchors:
        return {}

    by_q = {a.qnum: a for a in anchors}
    ordered = sorted(anchors, key=lambda a: (a.page, a.top))
    slices: dict[int, list[CropSlice]] = {}

    for i, anchor in enumerate(ordered):
        qnum = anchor.qnum
        next_anchor = ordered[i + 1] if i + 1 < len(ordered) else None
        parts: list[CropSlice] = []

        if not next_anchor:
            parts.append(CropSlice(page=anchor.page, top=max(0, anchor.top - 8), bottom=10_000))
        elif next_anchor.page == anchor.page:
            parts.append(
                CropSlice(
                    page=anchor.page,
                    top=max(0, anchor.top - 8),
                    bottom=max(anchor.top + 40, next_anchor.top - 8),
                )
            )
        else:
            parts.append(CropSlice(page=anchor.page, top=max(0, anchor.top - 8), bottom=10_000))
            for p in range(anchor.page + 1, next_anchor.page):
                parts.append(CropSlice(page=p, top=0, bottom=10_000))
            parts.append(
                CropSlice(page=next_anchor.page, top=0, bottom=max(40, next_anchor.top - 8))
            )

        slices[qnum] = parts

    return slices


def crop_and_save(page_paths: list[Path], slices: list[CropSlice], out_dir: Path) -> list[str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    saved: list[str] = []

    for idx, sl in enumerate(slices, start=1):
        page_path = page_paths[sl.page]
        with Image.open(page_path) as img:
            w, h = img.size
            top = min(sl.top, h - 1)
            bottom = min(sl.bottom, h) if sl.bottom < 9000 else h
            if bottom - top < 60:
                continue
            crop = img.crop((0, top, w, bottom))
            fname = f"scan-{idx:02d}.jpg"
            dest = out_dir / fname
            crop.convert("RGB").save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True)
            saved.append(fname)

    if saved:
        manifest = {"images": saved}
        (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return saved


def ocr_for_module(page_paths: list[Path], slices: list[CropSlice]) -> str:
    """Light OCR on first slice for module keyword matching."""
    import tempfile

    tesseract = shutil.which("tesseract")
    if not tesseract or not slices:
        return ""

    sl = slices[0]
    with Image.open(page_paths[sl.page]) as img:
        w, h = img.size
        top = min(sl.top, h - 1)
        bottom = min(sl.bottom, h) if sl.bottom < 9000 else min(h, top + 800)
        crop = img.crop((0, top, w, bottom))
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            crop.save(tmp_path)
            proc = subprocess.run(
                [tesseract, str(tmp_path), "stdout", "-l", "eng", "--psm", "6"],
                capture_output=True,
            )
            return proc.stdout.decode("utf-8", errors="replace") or ""
        finally:
            tmp_path.unlink(missing_ok=True)


def keyword_matches(keyword: str, text: str) -> bool:
    if len(keyword) < 5:
        return bool(re.search(r"\b" + re.escape(keyword) + r"\b", text))
    return keyword in text


def classify_module(text: str, modules: list[dict]) -> dict:
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


def process_pdf(
    paper_json_num: int,
    year: int,
    pdf_path: Path,
    pdf_url: str,
    modules: list[dict],
) -> list[dict]:
    clear_tsv_cache()
    work_dir = PDF_CACHE / str(year) / f"render-p{paper_json_num}"
    page_paths = render_pdf_pages(pdf_path, work_dir)
    content_start = find_content_start_page(page_paths)
    anchors = find_anchors(page_paths)
    slice_map = build_slices(anchors, len(page_paths))

    if len(slice_map) < 8:
        fallback = build_page_fallback_slices(page_paths, content_start)
        for qnum in range(1, 9):
            if qnum not in slice_map and qnum in fallback:
                slice_map[qnum] = fallback[qnum]
        if len(slice_map) < 8:
            print(f"    Warning: {len(slice_map)}/8 questions — using page fallback where needed")

    entries: list[dict] = []

    for qnum in range(1, 9):
        if qnum not in slice_map:
            continue
        qid = f"math{paper_json_num}-{year}-q{qnum}"
        out_dir = STUDY_QUESTIONS / qid
        images = crop_and_save(page_paths, slice_map[qnum], out_dir)
        if not images:
            continue

        used_fallback = qnum not in {a.qnum for a in anchors}
        ocr_snippet = ocr_for_module(page_paths, slice_map[qnum])
        mod = classify_module(ocr_snippet, modules)
        section = default_section(qnum)
        label = (
            f"UPSC {year} · Mathematics Paper {paper_json_num} · "
            f"Question {qnum} · Section {section} · {mod['module']} (official scan"
            f"{', page split' if used_fallback else ''})"
        )

        entries.append(
            {
                "id": qid,
                "year": year,
                "number": qnum,
                "section": section,
                "marks": 20,
                "text": label,
                "scanImages": images,
                "moduleId": mod["moduleId"],
                "module": mod["module"],
                "themeId": mod["themeId"],
                "theme": mod["theme"],
                "subthemes": [],
                "sourcePdf": pdf_url,
                "notes": empty_notes(),
            }
        )

    return entries


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
        "source": "upsc.gov.in — question scans cut from official PDFs (study/questions/math*)",
        "questions": sorted(questions, key=lambda q: (-q["year"], q["number"])),
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  Wrote {path.name}: {len(questions)} questions, years {years}")


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

            print(f"  Cutting scans Paper {paper_num}…")
            try:
                modules = modules_p1 if paper_num == 1 else modules_p2
                entries = process_pdf(paper_num, year, cache_path, url, modules)
                print(f"  → {len(entries)} question scans")
                if paper_num == 1:
                    all_q1.extend(entries)
                else:
                    all_q2.extend(entries)
            except Exception as exc:
                print(f"  Failed Paper {paper_num}: {exc}")

    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    INDEX_FILE.write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")

    write_paper_json(OUT_P1, 1, all_q1)
    write_paper_json(OUT_P2, 2, all_q2)

    missing = [y for y in range(2013, 2026) if str(y) not in index["years"] or len(index["years"][str(y)]) < 2]
    if missing:
        print(f"\nNot on upsc.gov.in (both papers): {missing}")

    print("\nDone. Question text in app = scan images under study/questions/math*")
    return 0


if __name__ == "__main__":
    sys.exit(main())
