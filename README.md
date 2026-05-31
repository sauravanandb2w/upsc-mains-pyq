# UPSC Mains PYQ — General Studies (Paper I to IV)

A lightweight, offline-friendly web app to browse **UPSC Civil Services (Main) Examination** previous year questions for **General Studies Papers 1–4**, organized year-wise with search and filters.

## Features

- **Paper-wise navigation** — GS I (Heritage, History, Geography), GS II (Polity, Governance, IR), GS III (Economy, S&T, Environment, Security), GS IV (Ethics & case studies)
- **Year filter** — 2020–2024 (extend by editing JSON under `data/`)
- **Marks filter** — 10, 15, 20 marks and case studies (Paper IV)
- **Keyword search** — search question text and topics
- **Dark mode** — persisted in browser storage

## Run locally

Opening `index.html` directly in the browser may block JSON loading. Use a simple local server:

```bash
cd upsc-mains-pyq
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

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
├── js/app.js
├── data/
│   ├── gs-paper-1.json
│   ├── gs-paper-2.json
│   ├── gs-paper-3.json
│   └── gs-paper-4.json
└── README.md
```

## Adding more questions

Edit the JSON file for the paper. Each question object:

```json
{
  "year": 2024,
  "number": 1,
  "marks": 10,
  "text": "Full question text as in the official paper.",
  "topics": ["Topic A", "Topic B"]
}
```

For GS Paper IV case studies, use `"marks": "case"` or any string containing `"case"` (e.g. `"20 case"`).

Always verify wording against the official question papers on [upsc.gov.in](https://upsc.gov.in).

## Disclaimer

Question texts are compiled for study purposes. For examination and citation, use the official UPSC papers only.
