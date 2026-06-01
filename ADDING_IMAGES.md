# Adding images & notebook scans

Diagrams, maps, flowcharts, and **photos of handwritten notes** live in the **`study/`** folder in this repo. They are **not** uploaded through the app UI.

| Content type | Where it is stored | How it syncs |
|--------------|-------------------|--------------|
| Text notes (brainstorm, tricks, etc.) | App text areas | Supabase (phone + laptop) |
| Images & markdown sheets | `study/` folder | Git → GitHub Pages |

**Workflow:** save image file → register in `manifest.json` → `git add` → `git commit` → `git push` → visible in the app in ~1 minute after deploy.

---

## Supported file types

| Format | Use for |
|--------|---------|
| `.jpg` / `.jpeg` | Notebook scans, photos (recommended for handwriting) |
| `.png` | Screenshots, exported diagrams |
| `.webp` | Compressed scans |
| `.svg` | Vector diagrams (editable in Cursor / draw.io) |
| `.gif` | Rare; animations |

Keep individual files under **~2 MB** when possible so the site stays fast on mobile.

---

## Where images appear in the app

| Subject | You add files under | You open in the app |
|---------|---------------------|---------------------|
| **GS — theme** | `study/themes/{themeId}/` | General Studies → **Themes** → pick theme → **Study materials** |
| **GS — question** | `study/questions/{questionId}/` | General Studies → **Questions** → expand **Diagrams & images** on a PYQ card |
| **Math — module** | `study/modules/{moduleId}/` | Mathematics Optional → **Modules** → pick module → **Standard results · derivations · tricks · scans** |

---

## 1. GS — images on a theme (e.g. Polity mind map)

Use this for **theme-wide** sheets: comparison tables, syllabus maps, flowcharts shared across many PYQs.

### Step 1 — Find the folder name

Theme folder name = `themeId` from `data/themes.json`.

| GS paper | Theme | Folder |
|----------|-------|--------|
| II | Constitution & Polity | `study/themes/constitution-polity/` |
| II | International Relations | `study/themes/international-relations/` |
| I | Modern India & Freedom Struggle | `study/themes/modern-history/` |

Full list: open `data/themes.json` → each theme’s `"id"` field.

If the folder does not exist yet:

```bash
mkdir -p study/themes/governance
```

### Step 2 — Add the image file

Put the file **inside** the theme folder (or keep scans in the root of that folder):

```text
study/themes/constitution-polity/
├── README.md              ← optional: tables, mermaid, text
├── federalism-overview.svg
└── manifest.json
```

You can also embed images in `README.md` with markdown: `![caption](./my-diagram.png)`.

### Step 3 — Register in `manifest.json`

Create or edit `study/themes/{themeId}/manifest.json`:

**Simple list (most common):**

```json
{
  "images": [
    "federalism-overview.svg",
    "basic-structure-flow.png"
  ]
}
```

**With captions:**

```json
{
  "images": [
    "overview.png",
    { "file": "timeline.png", "caption": "Freedom struggle chronology" }
  ]
}
```

**Advanced — mixed markdown + images:**

```json
{
  "sections": [
    { "type": "markdown", "file": "README.md", "title": "Core sheet" },
    { "type": "image", "file": "diagram.png", "title": "Federalism", "caption": "Union vs State" }
  ]
}
```

### Step 4 — Push

```bash
git add study/themes/constitution-polity/
git commit -m "Add polity federalism diagram"
git push
```

### Step 5 — Verify

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) → GS Paper II → **Themes** → Constitution & Polity → expand **Study materials**.

**Example in this repo:** `study/themes/constitution-polity/`

More GS theme notes: [`study/themes/README.md`](study/themes/README.md)

---

## 2. GS — images on a single PYQ (e.g. comparison table for 2024 Q1)

Use this when an image belongs to **one question only** (answer structure, map, timeline for that PYQ).

### Step 1 — Find the question ID

Format: `gs{paper}-{year}-q{number}`

Examples: `gs1-2024-q1`, `gs2-2024-q5`, `gs4-2023-q7`

The `id` field in `data/gs-paper-N.json` is the source of truth.

### Step 2 — Create the folder

```bash
mkdir -p study/questions/gs1-2024-q1
```

### Step 3 — Add image + manifest

```text
study/questions/gs1-2024-q1/
├── manifest.json
├── rig-to-later-vedic-comparison.png
└── README.md          ← optional
```

`manifest.json`:

```json
{
  "images": [
    "rig-to-later-vedic-comparison.png"
  ]
}
```

With caption:

```json
{
  "images": [
    {
      "file": "rig-to-later-vedic-comparison.png",
      "caption": "Rig Vedic vs Later Vedic — society & economy"
    }
  ]
}
```

Optional `README.md` for typed notes + extra mermaid (rendered when listed in `sections`).

### Step 4 — Push

```bash
git add study/questions/gs1-2024-q1/
git commit -m "Add GS1 2024 Q1 comparison diagram"
git push
```

### Step 5 — Verify

General Studies → **Questions** → find the PYQ → expand **Diagrams & images**.

**Examples in this repo:**

| Path | Content |
|------|---------|
| `study/questions/gs1-2024-q1/` | Comparison PNG |
| `study/questions/gs2-2024-q1/` | Answer structure |

---

## 3. Math Optional — notebook scans per module

Each of the **13 modules** has a fixed layout for **standard results**, **derivations**, **tricks**, and **important questions**. This is where you attach **photos of handwritten notes**.

### Step 1 — Pick module folder

| Module ID | Paper | Section |
|-----------|-------|---------|
| `linear-algebra` | I | A |
| `calculus` | I | A |
| `analytic-geometry` | I | A |
| `ode` | I | B |
| `dynamics-statics` | I | B |
| `vector-analysis` | I | B |
| `algebra` | II | A |
| `real-analysis` | II | A |
| `complex-analysis` | II | A |
| `linear-programming` | II | B |
| `pde` | II | B |
| `numerical-analysis` | II | B |
| `mechanics-fluid` | II | B |

Folder: `study/modules/{moduleId}/`  
Example: `study/modules/linear-algebra/`

### Step 2 — Folder layout inside a module

```text
study/modules/linear-algebra/
├── README.md
├── manifest.json
├── standard-results/      ← formulas & theorems to memorize
├── derivations/           ← proof steps from your notebook
├── tricks/                ← shortcuts & exam patterns
└── important-questions/   ← tough PYQs (scans or README table)
```

| Subfolder | What to scan |
|-----------|----------------|
| `standard-results/` | Standard results, identities, definition sheets |
| `derivations/` | Full derivations you must reproduce |
| `tricks/` | Shortcuts, “always remember” patterns |
| `important-questions/` | Solved tough PYQs or practice problems |

### Step 3 — Save the scan in the right subfolder

Example:

```text
study/modules/linear-algebra/standard-results/page-01.jpg
study/modules/linear-algebra/standard-results/page-02.jpg
study/modules/real-analysis/tricks/residue-shortcut.png
```

### Step 4 — Register in `manifest.json`

Each module already has a `manifest.json` with **gallery** sections. Add filenames to the matching `"images"` array.

Find the block where `"folder": "standard-results"` (or `derivations`, `tricks`, `important-questions`):

```json
{
  "type": "gallery",
  "title": "Standard results — memorize these",
  "folder": "standard-results",
  "images": [
    "page-01.jpg",
    "page-02.jpg",
    { "file": "eigenvalues.png", "caption": "Cayley–Hamilton & diagonalization" }
  ]
}
```

**Important:** The filename goes in `images[]` **relative to the subfolder**, not the module root.  
Correct: `"page-01.jpg"` with file at `standard-results/page-01.jpg`.  
Wrong: `"standard-results/page-01.jpg"` inside `"images"` when `"folder": "standard-results"` is already set.

Repeat for each gallery section you use.

### Step 5 — Push

```bash
git add study/modules/linear-algebra/
git commit -m "Add linear algebra standard results scans"
git push
```

### Step 6 — Verify

Mathematics Optional → **Modules** → Linear Algebra → expand **Standard results · derivations · tricks · scans**.

Empty galleries show a hint until you add files and list them in `manifest.json`.

More module details: [`study/modules/README.md`](study/modules/README.md)

---

## Helper script (Math modules only)

Copies a scan into the correct subfolder **and** updates `manifest.json`:

```bash
# Usage: python3 scripts/add-module-scan.py <moduleId> <subfolder> <path-to-image> [--caption "..."]

python3 scripts/add-module-scan.py linear-algebra standard-results ~/Downloads/scan.jpg

python3 scripts/add-module-scan.py real-analysis tricks ~/Desktop/trick.png --caption "Residue shortcut"
```

Valid subfolders: `standard-results`, `derivations`, `tricks`, `important-questions`

**Math PYQ solution scans** (parts a–e, per question id):

```bash
python3 scripts/add-solution-scan.py math1-2024-q1 a ~/Downloads/solution.jpg
python3 scripts/add-solution-scan.py math1-2024-q1 a ~/Downloads/page2.jpg --caption "Page 2"
```

GS themes and GS questions: add files manually (steps above). Same `manifest.json` format.

---

## Mathematics PYQ scans (auto-generated from official PDFs)

Math optional **Questions** view does **not** use OCR text. Each PYQ is shown as a **scan cutout** from the official upsc.gov.in PDF (same idea as GS question images in `study/questions/`).

| Item | Location |
|------|----------|
| Scan images | `study/questions/math1-2024-q1/scan-01.jpg` (etc.) |
| Manifest | `study/questions/math1-2024-q1/manifest.json` |
| Question metadata | `data/math-paper-1.json`, `data/math-paper-2.json` (`scanImages`, `sourcePdf`) |

Regenerate from cached PDFs (requires `poppler`, `tesseract`, `Pillow`):

```bash
pip install -r scripts/requirements.txt
python3 scripts/fetch-math-pyq.py          # download + cut scans
python3 scripts/fetch-math-pyq.py --no-fetch   # use cached PDFs only
python3 scripts/fetch-math-pyq.py --year 2024  # one year only
```

PDF cache (gitignored): `data/sources/math-pdfs/`. After regenerating, commit `study/questions/math*` and the updated JSON files, then push.

If auto-cropping misses a question on an old scan, open **Official PDF on upsc.gov.in** from the question card, or replace images manually in that question’s folder.

### Your handwritten solution scans (parts a–e) — **git only**

Solution photos are **not** stored in Supabase (size limits). They live in the repo like other study images — **push once, view on phone & laptop**.

**Helper script** (copies file + updates `manifest.json`):

```bash
python3 scripts/add-solution-scan.py math1-2024-q1 a ~/Desktop/my-solution.jpg
python3 scripts/add-solution-scan.py math1-2024-q1 a ~/Desktop/page-2.jpg   # part-a-02.jpg
git add study/questions/math1-2024-q1/
git commit -m "Add math1 2024 Q1 part (a) solution scans"
git push
```

Folder layout:

```text
study/questions/math1-2024-q1/
├── manifest.json
├── scan-01.jpg              ← official PYQ cutout (auto-generated)
└── solutions/
    ├── part-a-01.jpg        ← your handwritten solution, part (a)
    ├── part-a-02.jpg        ← second page, same part
    └── part-b-01.jpg
```

`manifest.json` (script updates this for you):

```json
{
  "images": ["scan-01.jpg"],
  "solutions": {
    "a": ["solutions/part-a-01.jpg", "solutions/part-a-02.jpg"],
    "b": ["solutions/part-b-01.jpg"]
  }
}
```

**Multiple photos per part:** run the script again for the same part — it auto-numbers `part-a-02.jpg`, `part-a-03.jpg`, …

**Text notes** (approach, standard results, mistakes) still sync via Supabase when signed in.

---

## `manifest.json` reference

### Format A — simple image list (GS themes & GS questions)

```json
{
  "images": [
    "file-one.png",
    { "file": "file-two.jpg", "caption": "Optional label", "alt": "Accessibility text" }
  ]
}
```

Files are resolved **relative to the same folder as `manifest.json`**.

### Format B — sections (GS themes & Math modules)

```json
{
  "sections": [
    { "type": "markdown", "file": "README.md", "title": "Overview" },
    { "type": "image", "file": "diagram.png", "caption": "Standalone figure" },
    {
      "type": "gallery",
      "title": "Gallery heading in the app",
      "folder": "standard-results",
      "images": ["page-01.jpg"],
      "emptyHint": "Shown when images[] is empty"
    }
  ]
}
```

| `type` | Purpose |
|--------|---------|
| `markdown` | Renders a `.md` file (tables, mermaid, text) |
| `image` | Single image next to other sections |
| `gallery` | Grid of images from `folder/` + `images[]` (Math modules) |

If both `sections` and top-level `images` exist, **`sections` takes precedence**.

---

## Preview before pushing

```bash
cd upsc-mains-pyq
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) and navigate to the theme, question, or module you edited.

Hard-refresh if an old image is cached: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux).

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Image not showing | Filename in `manifest.json` matches exactly (case-sensitive on Linux/GitHub) |
| Math scan missing | File is in the subfolder matching `"folder"` in the gallery block |
| Wrong gallery | Updated `images[]` under the correct `"folder"` key |
| Theme panel hidden | At least one of: non-empty `manifest.json`, or `README.md` with content |
| Works locally, not on phone | Did you `git push`? GitHub Pages redeploys after push |
| Huge repo | Prefer JPG for scans; resize before commit |

---

## Do not commit

- Full copyrighted books or coaching PDFs
- Secrets, API keys, personal phone numbers in scans
- Files outside `study/` unless you know why (keep assets in the structured folders above)

---

## Related docs

| File | Contents |
|------|----------|
| [`STUDY_MATERIALS.md`](STUDY_MATERIALS.md) | Markdown, mermaid, tables — overview |
| [`study/themes/README.md`](study/themes/README.md) | GS theme folders — quick reference |
| [`study/modules/README.md`](study/modules/README.md) | Math module map & PYQ JSON format |
