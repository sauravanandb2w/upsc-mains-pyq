# GS study folders — themes

One folder per **syllabus theme**. Used for diagrams, tables, flowcharts, and optional scans that apply to **many PYQs** in that theme.

**Full guide (step-by-step + manifest examples):** [`ADDING_IMAGES.md`](../../ADDING_IMAGES.md) → section **1. GS — images on a theme**

---

## Find your folder name

Folder name = `"id"` from `data/themes.json`.

| GS paper | Theme name | Folder |
|----------|------------|--------|
| I | Modern India & Freedom Struggle | `modern-history/` |
| II | Constitution & Polity | `constitution-polity/` |
| II | International Relations | `international-relations/` |
| II | Governance & Administration | `governance/` |

Create a new folder if yours is not in the repo yet:

```bash
mkdir -p study/themes/governance
```

---

## Minimum setup for images

```text
study/themes/constitution-polity/
├── manifest.json
└── my-diagram.png
```

`manifest.json`:

```json
{
  "images": ["my-diagram.png"]
}
```

Then: `git add study/themes/constitution-polity/ && git commit -m "Add diagram" && git push`

---

## Optional: markdown sheet

Add `README.md` for tables and mermaid flowcharts. See `constitution-polity/README.md` for a full example.

You can mix markdown + images in `manifest.json`:

```json
{
  "sections": [
    { "type": "markdown", "file": "README.md", "title": "Core sheet" },
    { "type": "image", "file": "federalism-overview.svg", "caption": "Lists diagram" }
  ]
}
```

---

## Where it shows in the app

**General Studies** → pick paper → **Themes** → open a theme → expand **Study materials — diagrams · tables · flowcharts**

---

## Per-question images

If the image is for **one PYQ only**, use `study/questions/` instead:

[`ADDING_IMAGES.md`](../../ADDING_IMAGES.md) → section **2. GS — images on a single PYQ**

Example: `study/questions/gs1-2024-q1/`
