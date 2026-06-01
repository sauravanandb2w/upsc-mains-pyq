#!/usr/bin/env python3
"""Copy a notebook scan into a math module folder and register it in manifest.json."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES = ROOT / "study" / "modules"

VALID_FOLDERS = frozenset(
    {"standard-results", "derivations", "tricks", "important-questions"}
)
VALID_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp", ".gif"})


def slugify(name: str) -> str:
    base = Path(name).stem.lower()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base or "scan"


def load_manifest(path: Path) -> dict:
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    raise SystemExit(f"Missing manifest: {path}")


def save_manifest(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def find_gallery_section(manifest: dict, folder: str) -> dict | None:
    for section in manifest.get("sections", []):
        if section.get("type") == "gallery" and section.get("folder") == folder:
            return section
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("module_id", help="e.g. linear-algebra")
    parser.add_argument(
        "folder",
        choices=sorted(VALID_FOLDERS),
        help="Target subfolder inside the module",
    )
    parser.add_argument("source", type=Path, help="Path to scan image")
    parser.add_argument("--caption", default="", help="Optional image caption")
    parser.add_argument(
        "--dest-name",
        default="",
        help="Output filename (default: slug from source name)",
    )
    args = parser.parse_args()

    module_dir = MODULES / args.module_id
    if not module_dir.is_dir():
        raise SystemExit(f"Unknown module: {args.module_id} (no folder {module_dir})")

    source = args.source.expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Source file not found: {source}")

    ext = source.suffix.lower()
    if ext not in VALID_EXTENSIONS:
        raise SystemExit(f"Unsupported extension {ext}. Use: {', '.join(sorted(VALID_EXTENSIONS))}")

    dest_name = args.dest_name or f"{slugify(source.name)}{ext}"
    if Path(dest_name).suffix.lower() not in VALID_EXTENSIONS:
        dest_name = f"{dest_name}{ext}"

    target_dir = module_dir / args.folder
    target_dir.mkdir(parents=True, exist_ok=True)
    dest_path = target_dir / dest_name

    if dest_path.exists():
        raise SystemExit(f"Already exists: {dest_path} — use --dest-name")

    shutil.copy2(source, dest_path)

    manifest_path = module_dir / "manifest.json"
    manifest = load_manifest(manifest_path)
    section = find_gallery_section(manifest, args.folder)
    if not section:
        raise SystemExit(
            f"No gallery section for folder '{args.folder}' in {manifest_path}"
        )

    images = section.setdefault("images", [])
    entry: str | dict = dest_name
    if args.caption:
        entry = {"file": dest_name, "caption": args.caption}

    if dest_name in images or any(
        isinstance(i, dict) and i.get("file") == dest_name for i in images
    ):
        print(f"Already listed in manifest: {dest_name}")
    else:
        images.append(entry)
        save_manifest(manifest_path, manifest)

    print(f"Copied → {dest_path.relative_to(ROOT)}")
    print(f"Updated → {manifest_path.relative_to(ROOT)}")
    print("Next: git add, commit, push")


if __name__ == "__main__":
    main()
