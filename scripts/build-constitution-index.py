#!/usr/bin/env python3
"""
Extract searchable article index from the Constitution bare-act PDF.
Input:  data/sources/the_constitution_of_india.pdf
Output: data/constitution-index.json
        study/constitution/constitution-of-india.pdf (copy for GitHub Pages)
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF_SOURCE = ROOT / "data" / "sources" / "the_constitution_of_india.pdf"
PDF_PUBLIC = ROOT / "study" / "constitution" / "constitution-of-india.pdf"
INDEX_OUT = ROOT / "data" / "constitution-index.json"

TOC_PAGE_START = 4
TOC_PAGE_END = 22
BODY_PAGE_START = 23
BODY_PAGE_END = 174


def load_pdf():
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise SystemExit(
            "Install pypdf in the project venv: python3 -m venv .venv && "
            ".venv/bin/pip install pypdf"
        ) from exc
    if not PDF_SOURCE.is_file():
        raise SystemExit(f"Missing PDF: {PDF_SOURCE}")
    return PdfReader(str(PDF_SOURCE))


def clean_page(text: str, page_num: int) -> str:
    text = (text or "").strip()
    text = re.sub(rf"^{page_num}\s*\n", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_toc(reader) -> list[dict]:
    """Parse table of contents for article numbers and titles."""
    entries: list[dict] = []
    seen: set[str] = set()

    line_re = re.compile(r"^(\d+[A-Z]?)\.\s+(.+?)\.?\s*$")

    for page_num in range(TOC_PAGE_START, TOC_PAGE_END + 1):
        raw = reader.pages[page_num - 1].extract_text() or ""
        for line in raw.splitlines():
            line = line.strip()
            line = re.sub(r"^\d+\s+", "", line)
            m = line_re.match(line)
            if not m:
                continue
            num, title = m.group(1), m.group(2).strip().rstrip(".")
            if num in seen:
                continue
            if title.lower().startswith("[omitted"):
                title = "[Omitted]"
            if len(title) < 3 or title.isdigit():
                continue
            seen.add(num)
            entries.append({"number": num, "title": title})

    def sort_key(item: dict) -> tuple:
        num = item["number"]
        m = re.match(r"^(\d+)([A-Z]?)$", num)
        if not m:
            return (9999, num)
        return (int(m.group(1)), m.group(2) or "")

    entries.sort(key=sort_key)
    return entries


def extract_body_pages(reader) -> list[dict]:
    pages = []
    for page_num in range(BODY_PAGE_START, BODY_PAGE_END + 1):
        raw = reader.pages[page_num - 1].extract_text() or ""
        text = clean_page(raw.replace("\n", " "), page_num)
        pages.append({"page": page_num, "text": text})
    return pages


def article_sort_key(num: str) -> tuple:
    m = re.match(r"^(\d+)([A-Z]?)$", num)
    if not m:
        return (9999, num)
    return (int(m.group(1)), m.group(2) or "")


def locate_articles(toc: list[dict], body_pages: list[dict]) -> list[dict]:
    """Find each article's page and text snippet in the body."""
    full_text = " ".join(p["text"] for p in body_pages)
    page_offsets: list[tuple[int, int]] = []
    offset = 0
    for p in body_pages:
        page_offsets.append((offset, p["page"]))
        offset += len(p["text"]) + 1

    def page_for_offset(pos: int) -> int:
        page = BODY_PAGE_START
        for start, pnum in page_offsets:
            if pos >= start:
                page = pnum
        return page

    articles: list[dict] = []

    for i, entry in enumerate(toc):
        num = entry["number"]
        title = entry["title"]
        title_words = re.escape(title[: min(40, len(title))])

        patterns = [
            rf"\b{re.escape(num)}\.\s+{title_words}",
            rf"\b\*{{0,2}}{re.escape(num)}\.\s+{title_words}",
            rf"\b{re.escape(num)}\.\s+\[?{title_words}",
            rf"\*{{1,3}}{re.escape(num)}\.\s+{title_words}",
        ]

        start = -1
        for pat in patterns:
            m = re.search(pat, full_text, re.IGNORECASE)
            if m:
                start = m.start()
                break

        if start < 0:
            # Fallback: number only near a distinctive title word
            words = [w for w in re.split(r"\W+", title) if len(w) > 4][:3]
            if words:
                pat = rf"\b{re.escape(num)}\.\s+[^.]{{0,80}}{re.escape(words[0])}"
                m = re.search(pat, full_text, re.IGNORECASE)
                if m:
                    start = m.start()

        if start < 0 and len(title) > 15:
            title_chunk = re.escape(title[: min(55, len(title))])
            m = re.search(title_chunk, full_text, re.IGNORECASE)
            if m:
                start = max(0, m.start() - 15)

        if start < 0:
            articles.append(
                {
                    "number": num,
                    "title": title,
                    "text": "",
                    "page": None,
                    "found": False,
                }
            )
            continue

        end = len(full_text)
        if i + 1 < len(toc):
            next_num = toc[i + 1]["number"]
            next_title = toc[i + 1]["title"]
            next_words = re.escape(next_title[: min(30, len(next_title))])
            next_pat = rf"\b{re.escape(next_num)}\.\s+{next_words}"
            m = re.search(next_pat, full_text[start + 5 :], re.IGNORECASE)
            if m:
                end = start + 5 + m.start()

        snippet = full_text[start:end].strip()
        snippet = re.sub(r"\s+", " ", snippet)
        if len(snippet) > 5000:
            snippet = snippet[:5000] + "…"

        articles.append(
            {
                "number": num,
                "title": title,
                "text": snippet,
                "page": page_for_offset(start),
                "found": True,
            }
        )

    return articles


def main() -> None:
    reader = load_pdf()
    toc = parse_toc(reader)
    body_pages = extract_body_pages(reader)
    articles = locate_articles(toc, body_pages)

    found = sum(1 for a in articles if a["found"])
    PDF_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PDF_SOURCE, PDF_PUBLIC)

    payload = {
        "source": "the_constitution_of_india.pdf",
        "asOn": "2020-12-09",
        "pdfPath": "study/constitution/constitution-of-india.pdf",
        "articleCount": len(articles),
        "articlesFound": found,
        "articles": articles,
    }

    INDEX_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {INDEX_OUT.name}: {len(articles)} TOC entries, {found} with body text")
    print(f"Copied PDF → {PDF_PUBLIC.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
