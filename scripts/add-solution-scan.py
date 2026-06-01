#!/usr/bin/env python3
"""Copy a handwritten solution scan into a math PYQ folder (git) and register in manifest.json.

Usage:
  python3 scripts/add-solution-scan.py math1-2024-q1 a ~/Desktop/solution-page1.jpg
  python3 scripts/add-solution-scan.py math1-2024-q1 a ~/Desktop/page2.jpg --caption "Page 2"

Then: git add, commit, push — visible on phone & laptop via GitHub Pages.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS = ROOT / "study" / "questions"
VALID_PARTS = frozenset({"a", "b", "c", "d", "e"})
VALID_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp"})
QUESTION_ID = re.compile(r"^math[12]-\d{4}-q[1-8]$")


def slugify(name: str) -> str:
    base = Path(name).stem.lower()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base or "scan"


def load_manifest(path: Path) -> dict:
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def save_manifest(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def next_part_filename(solutions_dir: Path, part: str, ext: str) -> str:
    for n in range(1, 100):
        name = f"part-{part}-{n:02d}{ext}"
        if not (solutions_dir / name).exists():
            return name
    raise SystemExit("Too many scans for this part (max 99)")


def rel_solutions_path(filename: str) -> str:
    return f"solutions/{filename}"


def register_solution(manifest: dict, part: str, rel_path: str, caption: str = "") -> None:
    solutions = manifest.setdefault("solutions", {})
    entries = solutions.setdefault(part, [])
    if isinstance(entries, str):
        entries = [entries]
        solutions[part] = entries

    if rel_path in entries:
        return
    if any(isinstance(i, dict) and i.get("file") == rel_path for i in entries):
        return

    if caption:
        entries.append({"file": rel_path, "caption": caption})
    else:
        entries.append(rel_path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("question_id", help="e.g. math1-2024-q1")
    parser.add_argument("part", choices=sorted(VALID_PARTS), help="Sub-part a–e")
    parser.add_argument("source", type=Path, help="Path to scan image")
    parser.add_argument("--caption", default="", help="Optional caption in the app")
    parser.add_argument(
        "--dest-name",
        default="",
        help="Output filename under solutions/ (default: part-{part}-NN.ext)",
    )
    args = parser.parse_args()

    qid = args.question_id.strip()
    if not QUESTION_ID.match(qid):
        raise SystemExit(f"Invalid question id: {qid} (expected e.g. math1-2024-q1)")

    question_dir = QUESTIONS / qid
    question_dir.mkdir(parents=True, exist_ok=True)

    source = args.source.expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Source file not found: {source}")

    ext = source.suffix.lower()
    if ext == ".jpeg":
        ext = ".jpg"
    if ext not in VALID_EXTENSIONS:
        raise SystemExit(f"Unsupported extension {ext}. Use: {', '.join(sorted(VALID_EXTENSIONS))}")

    solutions_dir = question_dir / "solutions"
    solutions_dir.mkdir(parents=True, exist_ok=True)

    if args.dest_name:
        dest_name = args.dest_name
        if Path(dest_name).suffix.lower() not in VALID_EXTENSIONS:
            dest_name = f"{dest_name}{ext}"
    else:
        dest_name = next_part_filename(solutions_dir, args.part, ext)

    dest_path = solutions_dir / dest_name
    if dest_path.exists():
        raise SystemExit(f"Already exists: {dest_path} — use --dest-name")

    shutil.copy2(source, dest_path)

    manifest_path = question_dir / "manifest.json"
    manifest = load_manifest(manifest_path)

    if not manifest.get("images") and list(question_dir.glob("scan-*.jpg")):
        manifest["images"] = sorted(p.name for p in question_dir.glob("scan-*.jpg"))

    rel_path = rel_solutions_path(dest_name)
    register_solution(manifest, args.part, rel_path, args.caption.strip())
    save_manifest(manifest_path, manifest)

    print(f"Copied → {dest_path.relative_to(ROOT)}")
    print(f"Updated → {manifest_path.relative_to(ROOT)}")
    print()
    print("Next (syncs to phone & laptop after deploy):")
    print(f"  git add {question_dir.relative_to(ROOT)}/")
    print(f'  git commit -m "Add {qid} part ({args.part}) solution scan"')
    print("  git push")


if __name__ == "__main__":
    main()
