# UPSC Mains PYQ — General Studies (Paper I to IV) & Mathematics Optional

A lightweight, offline-friendly web app to browse **UPSC Civil Services (Main) Examination** previous year questions for **General Studies Papers 1–4** and **Mathematics Optional**, with theme-wise notes, cloud sync, and rich text.

**Live app:** [sauravanandb2w.github.io/upsc-mains-pyq](https://sauravanandb2w.github.io/upsc-mains-pyq/)

Companion to [upsc-current-affairs](https://github.com/sauravanandb2w/upsc-current-affairs) — **separate repo, separate Supabase project**.

---

## Ready to use?

**Yes** — for daily PYQ practice and note-taking:

1. Open the live link above (or run locally — see below).
2. **Sign in** → theme notes and question notes sync across phone and laptop.
3. Optional: **Connect GitHub** → upload diagrams/scans to `study/` from the app.
4. After deploy updates, **hard refresh** once (`Cmd+Shift+R`) if something looks broken.

Without sign-in, notes save in the browser only on that device.

---

## Features

| Area | What you get |
|------|----------------|
| **Browse PYQs** | GS I–IV (2013–2025); Math Optional Paper I & II (modules, Section A/B) |
| **Filters** | Year · marks · keyword search · Ethics case studies (GS IV) |
| **Theme notes (GS)** | Brainstorm · Static · Quotes · CA · Value — per syllabus theme |
| **Question notes** | Intro · Static · Quotes · CA · Topper points · Best answer online |
| **Math modules** | Standard results, derivations, tricks, difficult questions + scan galleries |
| **Rich text** | Bold, italic, underline, lists — **preserved on Supabase sync** |
| **Note boxes** | Fixed height with **scroll**; **S / M / L** in header |
| **Field lock** | Padlock per box — **keep editing locally**; changes **won’t sync to other devices** until unlock |
| **Study materials** | Markdown, tables, mermaid, images from `study/` (git-backed) |
| **Export** | Download all notes as JSON or Markdown |

---

## Day-to-day workflow

1. Pick **GS** or **Math** → paper → **Themes** or **Questions**.
2. Type in note fields — auto-saves (debounced) to Supabase when signed in.
3. Use toolbar for **bold / italic / lists**; use **S / M / L** if boxes feel too small/large.
4. **Lock** a field when you want local-only edits (e.g. rough draft) — unlock when ready to sync everywhere.
5. **Sync notes** button (when signed in) — push/pull if you switched devices.

Lock legend: **open lock** = syncing · **closed lock** = edit locally, no cross-device sync until unlock.

---

## Run locally

Opening `index.html` directly may block JSON loading. Use a local server:

```bash
cd upsc-mains-pyq
cp js/config.example.js js/config.js   # Supabase URL + anon key
python3 -m http.server 8080
# → http://localhost:8080
```

---

## Sync notes (phone + laptop)

Notes sync via **Supabase** (free tier). Setup:

1. Create a Supabase project (not the CA project).
2. Run `supabase/schema.sql`.
3. Copy `js/config.example.js` → `js/config.js` and add keys.

Full guide: **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

- **Themes** tab — main workspace per GS syllabus theme  
- **Questions** tab — per-PYQ notes  
- Same login on phone and laptop → same notes (except locked fields until unlock)

---

## GitHub (optional — images & study files)

Upload notebook scans and study assets from the app into `study/`.

Setup: **[GITHUB_UPLOAD_SETUP.md](./GITHUB_UPLOAD_SETUP.md)**

---

## Host online (free)

Static site — no backend required on your server.

| Option | Best for |
|--------|----------|
| [GitHub Pages](https://pages.github.com/) | Free URL + `git push` updates |
| [Netlify Drop](https://app.netlify.com/drop) | Fastest one-off deploy |
| [Cloudflare Pages](https://pages.cloudflare.com/) | CDN + custom domain |

Step-by-step: **[DEPLOY.md](./DEPLOY.md)**

---

## Build / update question bank

Questions compile from [UPSC-Star](https://github.com/amanbh2/UPSC-Star), ClearIAS, Insights on India, and local supplements.

```bash
cd upsc-mains-pyq
curl -sL "https://raw.githubusercontent.com/amanbh2/UPSC-Star/master/UPSC%20Star%20Data.json" \
  -o scripts/upsc-star-source.json
python3 scripts/build-pyq-data.py
```

Use `python3 scripts/build-pyq-data.py --no-fetch` to rebuild from local files only.

Dedupe junk/duplicate GS rows:

```bash
python3 scripts/dedupe-pyq-questions.py --dry-run
python3 scripts/dedupe-pyq-questions.py
```

### Paper-specific builders

| Script | Output |
|--------|--------|
| `scripts/build-gs1-insights.py` | GS I merge from Insights on India |
| `scripts/build-gs3-insights.py` | GS III |
| `scripts/build-gs4-insights.py` | GS IV (Ethics + case studies) |
| `scripts/fetch-math-pyq.py` | Math Optional from upsc.gov.in PDFs (needs `tesseract`, `poppler`) |

**Coverage (approx.):** GS I–IV 2013–2025; Math Optional 2014–2025 (official PDF scans). Verify wording on [upsc.gov.in](https://www.upsc.gov.in/examinations/previous-question-papers).

---

## Project structure

```
upsc-mains-pyq/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js
│   ├── notes-store.js
│   ├── rich-notes.js
│   ├── supabase-client.js
│   └── config.example.js   → copy to config.js
├── supabase/schema.sql
├── data/                   # gs-paper-*.json, math-paper-*.json
├── study/
│   ├── themes/             # GS theme sheets
│   ├── questions/          # per-PYQ assets
│   └── modules/            # Math optional
├── ADDING_IMAGES.md
├── STUDY_MATERIALS.md
├── SUPABASE_SETUP.md
├── DEPLOY.md
└── README.md
```

Rich diagrams and scans: **[ADDING_IMAGES.md](./ADDING_IMAGES.md)** · Overview: **[STUDY_MATERIALS.md](./STUDY_MATERIALS.md)**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Can't type after lock (old cache) | Hard refresh `Cmd+Shift+R` — locked fields stay editable |
| Notes not on other device | Sign in with same account; check field isn’t locked |
| JSON / blank app locally | Use `python3 -m http.server`, not `file://` |
| Formatting lost | Update app; notes store HTML in Supabase |

---

## Disclaimer

Question texts are compiled for study purposes. For examination and citation, use the official UPSC papers only.
