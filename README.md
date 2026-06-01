# UPSC Mains PYQ — General Studies (Paper I to IV) & Mathematics Optional

A lightweight, offline-friendly web app to browse **UPSC Civil Services (Main) Examination** previous year questions for **General Studies Papers 1–4** and **Mathematics Optional**, organized year-wise with search and filters.

## Features

- **Paper-wise navigation** — GS I–IV; Math Optional Paper I & II (13 modules, Section A/B)
- **Year filter** — 2013–2025 (per paper; see coverage note in app)
- **Marks filter** — 10, 15, 20 marks and case studies (Paper IV)
- **Keyword search** — questions, topics, and study notes
- **Theme-wise notes (GS)** — brainstorm by syllabus theme; sync across devices when signed in
- **Module-wise notes (Math)** — standard results, derivations, tricks, difficult questions + notebook scan galleries
- **Question mode** — browse PYQs with filters; optional per-question notes
- **Cloud sync** — Supabase (phone + laptop) or local-only fallback
- **Study materials** — markdown, tables, mermaid flowcharts, images from `study/` folder (push to GitHub). **How to add scans:** [ADDING_IMAGES.md](./ADDING_IMAGES.md)
- **Your notes** — Brainstorm · Static · Quotes · CA · Value (themes); Intro · Topper points (questions) — synced via Supabase

## Build / update question bank

Questions are compiled from [UPSC-Star](https://github.com/amanbh2/UPSC-Star) (GS I–III, 2013–2021) plus ClearIAS pages and local supplements (`data/sources/`).

```bash
cd upsc-mains-pyq
# Download UPSC-Star source (once)
curl -sL "https://raw.githubusercontent.com/amanbh2/UPSC-Star/master/UPSC%20Star%20Data.json" \
  -o scripts/upsc-star-source.json
# Rebuild all four JSON files (network; ~2 min)
python3 scripts/build-pyq-data.py
```

Use `python3 scripts/build-pyq-data.py --no-fetch` to rebuild from local files only.

Remove duplicate or junk GS questions (exact/near-duplicate text, bad scrape rows):

```bash
python3 scripts/dedupe-pyq-questions.py --dry-run
python3 scripts/dedupe-pyq-questions.py
```

### GS Paper IV (Ethics) — Insights on India index

Builds **`data/gs-paper-4.json`** (237 PYQs, 2013–2025) from the subject-wise list at [Insights on India](https://www.insightsonindia.com/upsc-mains-general-studies-4-pyq/), with **`insightsSection`** on each question matching their categories (Ethics and Human Interface, Attitude, Case Study blocks, etc.).

```bash
# Uses cached export in data/sources/insights-gs4-pyq.md
python3 scripts/build-gs4-insights.py

# Or fetch live page (HTML stripped to text)
python3 scripts/build-gs4-insights.py --fetch

# Custom markdown export
python3 scripts/build-gs4-insights.py --input path/to/export.md
```

Re-run after updating the source markdown. Verify wording against official UPSC papers where needed.

### GS Paper I — Insights on India index

Merges **`data/gs-paper-1.json`** with the subject-wise list at [Insights on India](https://www.insightsonindia.com/upsc-mains-general-studies-1-pyq/). By default only **years with zero questions** in the current JSON are filled (avoids duplicate entries in years already loaded from UPSC-Star/ClearIAS).

```bash
# Uses cached export in data/sources/insights-gs1-pyq.md
python3 scripts/build-gs1-insights.py

python3 scripts/build-gs1-insights.py --fetch
python3 scripts/build-gs1-insights.py --input path/to/export.md
python3 scripts/build-gs1-insights.py --fill-all-years   # optional: top up years below 20
```

### GS Paper III — Insights on India index

Builds **`data/gs-paper-3.json`** (258 PYQs, 2013–2025) from the subject-wise list at [Insights on India](https://www.insightsonindia.com/upsc-mains-general-studies-3-pyq/), with **`insightsSection`** on each question (Indian Economy, Agriculture, S&T, Environment, Internal Security, etc.).

```bash
# Uses cached export in data/sources/insights-gs3-pyq.md
python3 scripts/build-gs3-insights.py

python3 scripts/build-gs3-insights.py --fetch
python3 scripts/build-gs3-insights.py --input path/to/export.md
```

### Mathematics Optional PYQs (official UPSC PDFs)

Fetches **Civil Services (Main) Mathematics Optional** Paper I & II from [upsc.gov.in](https://www.upsc.gov.in/examinations/previous-question-papers), OCRs scanned PDFs, classifies by module, writes `data/math-paper-1.json` and `data/math-paper-2.json`.

**Requires:** `tesseract` + `poppler` (for `pdftoppm`) — macOS: `brew install tesseract poppler`

```bash
python3 scripts/fetch-math-pyq.py           # download + OCR + rebuild JSON
python3 scripts/fetch-math-pyq.py --no-fetch  # reuse cached PDFs in data/sources/math-pdfs/
python3 scripts/fetch-math-pyq.py --year 2024   # single year
```

Question text is shown as **official PDF scan cutouts** under `study/questions/math*`. Year **2013** is not on upsc.gov.in; **2016, 2017, 2020** use local PDFs in `data/sources/` (`MATH1_YYYY.pdf`, `MATH2_YYYY.pdf`, or `MATHS_I.pdf` / `MATHS_II.pdf`).

**Coverage (approx.):** **GS I–IV 2013–2025** (GS I–III via UPSC-Star/ClearIAS/local JSON + Insights merge; GS IV via Insights). **Math Optional 2014–2025** (official PDF scans; 2013 not loaded). Some GS I years have &gt;20 entries (legacy duplicates); GS III Insights index may show fewer than 20 per year in a few early years. The app data note lists gaps. Verify wording on [upsc.gov.in](https://upsc.gov.in/examinations/previous-question-papers).

## Run locally

Opening `index.html` directly in the browser may block JSON loading. Use a simple local server:

```bash
cd upsc-mains-pyq
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Sync notes (phone + laptop)

Notes sync via **Supabase** (free tier). Without setup, notes save in the browser only.

```bash
cp js/config.example.js js/config.js
# Edit js/config.js with your Supabase URL + anon key
```

Full setup: **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** — create project, run `supabase/schema.sql`, sign in.

- **Themes** tab — main brainstorm workspace per syllabus theme
- **Questions** tab — PYQ browser with per-question notes
- Same login on phone and laptop → same notes

## Host online (free)

This is a static site — no server or database. Pick any option below.

| Option | Best for | Effort |
|--------|----------|--------|
| [Netlify Drop](https://app.netlify.com/drop) | Fastest — live URL in ~1 minute | Drag a zip of this folder |
| [GitHub Pages](https://pages.github.com/) | Free URL + updates when you `git push` | Create repo, push, enable Pages |
| [Cloudflare Pages](https://pages.cloudflare.com/) | Custom domain, CDN | Connect Git or upload folder |

Full step-by-step: **[DEPLOY.md](./DEPLOY.md)**

After deploy, your site URL will look like:

- `https://random-name.netlify.app` (Netlify)
- `https://YOUR_USERNAME.github.io/upsc-mains-pyq/` (GitHub project site)

## Project structure

```
upsc-mains-pyq/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js
│   ├── notes-store.js
│   ├── supabase-client.js
│   └── config.example.js   → copy to config.js
├── supabase/schema.sql
├── SUPABASE_SETUP.md
├── data/
│   ├── gs-paper-1.json … gs-paper-4.json
│   ├── math-paper-1.json
│   ├── math-paper-2.json
│   └── math-modules.json
├── study/
│   ├── themes/           ← GS theme sheets
│   ├── questions/        ← GS per-PYQ diagrams
│   └── modules/          ← Math optional (scans + manifest)
├── ADDING_IMAGES.md      ← how to add scans (GS + Math)
├── STUDY_MATERIALS.md
└── README.md
```

## Adding more questions

Add a file under `data/sources/` (or edit generated `data/gs-paper-N.json` then run build), e.g.:

```json
{
  "paper": 2,
  "questions": [
    {
      "year": 2025,
      "number": 1,
      "marks": 10,
      "text": "Official question text…"
    }
  ]
}
```

Each question has `theme`, `themeId`, and empty `notes` fields. Edit `data/themes.json` to tune classification keywords.

For GS Paper IV case studies, use `"marks": "case"`.

Always verify wording against official papers on [upsc.gov.in](https://upsc.gov.in).

Rich diagrams, tables, and notebook scans: **[ADDING_IMAGES.md](./ADDING_IMAGES.md)** (GS themes · GS questions · Math modules). Overview: [STUDY_MATERIALS.md](./STUDY_MATERIALS.md).

## Disclaimer

Question texts are compiled for study purposes. For examination and citation, use the official UPSC papers only.
