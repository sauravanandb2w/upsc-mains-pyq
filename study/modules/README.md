# Math Optional — module study folders

One folder per **syllabus module** (13 total). Used for **notebook scans**: standard results, derivations, tricks, and important questions.

**Full guide (step-by-step + manifest examples):** [`ADDING_IMAGES.md`](../../ADDING_IMAGES.md) → section **3. Math Optional — notebook scans per module**

---

## Module map

| Folder (`study/modules/…`) | Paper | Section |
|----------------------------|-------|---------|
| `linear-algebra/` | I | A |
| `calculus/` | I | A |
| `analytic-geometry/` | I | A |
| `ode/` | I | B |
| `dynamics-statics/` | I | B |
| `vector-analysis/` | I | B |
| `algebra/` | II | A |
| `real-analysis/` | II | A |
| `complex-analysis/` | II | A |
| `linear-programming/` | II | B |
| `pde/` | II | B |
| `numerical-analysis/` | II | B |
| `mechanics-fluid/` | II | B |

App path: **Mathematics Optional** → **Modules** → pick module.

---

## Subfolders inside each module

| Subfolder | Put scans here |
|-----------|----------------|
| `standard-results/` | Formulas, theorems, identities to memorize |
| `derivations/` | Proof steps from your notes |
| `tricks/` | Shortcuts and exam patterns |
| `important-questions/` | Tough PYQs or solved problems |

Each module already has a `manifest.json` with gallery sections for these four folders.

---

## Quick add (manual)

1. Save scan: `study/modules/linear-algebra/standard-results/page-01.jpg`
2. Edit `manifest.json` — under `"folder": "standard-results"`, set `"images": ["page-01.jpg"]`
3. `git add`, `commit`, `push`

---

## Quick add (script)

```bash
python3 scripts/add-module-scan.py linear-algebra standard-results ~/Downloads/scan.jpg

python3 scripts/add-module-scan.py real-analysis tricks ~/Desktop/trick.png --caption "Residue shortcut"
```

Subfolders: `standard-results` · `derivations` · `tricks` · `important-questions`

---

## Synced text vs git scans

| In the app text areas | In `study/modules/` (git) |
|-----------------------|---------------------------|
| Searchable summaries | Handwritten notebook photos |
| Syncs via Supabase | Syncs via `git push` |
| Standard results, tricks (typed) | Same content as scans when you don’t retype |

Use both: type key formulas for search; attach scans for full notebook pages.

---

## Adding PYQs

Edit `data/math-paper-1.json` or `data/math-paper-2.json` — see [`ADDING_IMAGES.md`](../../ADDING_IMAGES.md) or example in module `README.md` files.
