# Study materials — diagrams, tables, flowcharts

Rich content lives in the **git repo** (not Supabase). Edit in Cursor → push to GitHub → shows on the live site and in the app.

**Quick notes** (brainstorm, quotes) → app textareas → Supabase (synced)  
**Rich content** (diagrams, tables, mermaid) → `study/` folder → GitHub Pages

---

## Folder layout

```
study/
├── themes/
│   └── {themeId}/          ← must match themeId in data/themes.json
│       ├── README.md       ← main content (tables, mermaid, text)
│       ├── manifest.json   ← optional: list extra images/files
│       └── *.png / *.svg   ← diagrams you export
└── questions/
    └── {questionId}/       ← e.g. gs2-2024-q1 (matches question id in JSON)
        ├── README.md
        ├── manifest.json
        └── *.png
```

### Theme IDs (examples)

| Paper | Theme | Folder name |
|-------|-------|-------------|
| GS II | Constitution & Polity | `study/themes/constitution-polity/` |
| GS II | International Relations | `study/themes/international-relations/` |
| GS I | Modern Indian History | `study/themes/modern-history/` |

See full list in `data/themes.json` → each theme’s `"id"` field.

### Question IDs

Format: `gs{paper}-{year}-q{number}` — e.g. `gs2-2024-q1`, `gs4-2023-q7`.

---

## Quick start — add a theme sheet

```bash
mkdir -p study/themes/governance
```

Create `study/themes/governance/README.md` with tables and optional mermaid flowcharts (see `study/themes/constitution-polity/README.md` for a full example).

Push to `main` → open app → **Themes** → GS II → **Governance & Administration** → expand **Study materials**.

---

## manifest.json (optional)

Use when you have **images outside README** or **multiple markdown files**.

```json
{
  "sections": [
    { "type": "markdown", "file": "README.md", "title": "Overview" },
    {
      "type": "image",
      "file": "my-diagram.png",
      "caption": "Local bodies structure",
      "alt": "Diagram of panchayat tiers"
    }
  ]
}
```

If `manifest.json` is missing, the app loads `README.md` only.

---

## Embedding images in markdown

Export from Excalidraw / draw.io / Canva → save in the same folder:

```markdown
![Federalism diagram](./federalism-overview.svg)
```

Paths are relative to the theme/question folder.

---

## Workflow

1. **Create** — markdown + PNG/SVG in `study/`
2. **Preview locally** — `python3 -m http.server 8080` → open theme in app
3. **Push** — `git add study/ && git commit -m "Add governance diagrams" && git push`
4. **Live** — GitHub Actions redeploys in ~1 min

---

## Examples in this repo

| Path | What |
|------|------|
| `study/themes/constitution-polity/` | Table + mermaid + SVG diagram |
| `study/questions/gs2-2024-q1/` | Answer structure + flowchart for 2024 Q1 |

---

## Tips

- **Mermaid** — flowcharts in markdown code fences with ` ```mermaid ` 
- **Large PDFs** — host on Drive, link in README
- **Phone** — images and tables render in the app; edit files on laptop only
- **Don’t** put secrets or copyrighted full books in the repo
