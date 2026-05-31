# UPSC Mains PYQ — General Studies (Paper I to IV)

A lightweight, offline-friendly web app to browse **UPSC Civil Services (Main) Examination** previous year questions for **General Studies Papers 1–4**, organized year-wise with search and filters.

## Features

- **Paper-wise navigation** — GS I (Heritage, History, Geography), GS II (Polity, Governance, IR), GS III (Economy, S&T, Environment, Security), GS IV (Ethics & case studies)
- **Year filter** — 2013–2025 (per paper; see coverage note in app)
- **Marks filter** — 10, 15, 20 marks and case studies (Paper IV)
- **Keyword search** — questions, topics, and study notes
- **Theme-wise notes** — brainstorm by syllabus theme (primary mode); sync across devices when signed in
- **Question mode** — browse PYQs with filters; optional per-question notes
- **Cloud sync** — Supabase (phone + laptop) or local-only fallback
- **Study materials** — markdown, tables, mermaid flowcharts, images from `study/` folder (push to GitHub)
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

**Coverage (approx.):** GS II & III 2013–2024; GS I from 2015; GS IV partial (ethics paper parsing is harder). Missing years are listed in the app. Add JSON under `data/sources/` and rebuild. Verify wording on [upsc.gov.in](https://upsc.gov.in/examinations/previous-question-papers).

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
│   ├── gs-paper-1.json
│   ├── gs-paper-2.json
│   ├── gs-paper-3.json
│   └── gs-paper-4.json
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

Rich diagrams/tables: see **[STUDY_MATERIALS.md](./STUDY_MATERIALS.md)**.

## Disclaimer

Question texts are compiled for study purposes. For examination and citation, use the official UPSC papers only.
