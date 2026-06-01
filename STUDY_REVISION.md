# Revision & study tools

Features for tracking PYQ progress, spaced revision, timed answer practice, and note backups.

---

## Question status

On each question card (GS and Math):

| Status | Use for |
|--------|---------|
| **Not started** | Default — haven’t attempted |
| **Attempted** | You tried an answer |
| **Revised** | You reviewed after attempt (sets last-revised date) |
| **Weak** | Needs another pass |

Status syncs via **Sign in** (Supabase), same as text notes.

---

## Star (bookmark)

Click **☆** on a question card → **★** starred.

Starred questions appear in **Revise today** when due.

---

## Filters (Questions view)

| Filter | Effect |
|--------|--------|
| **Status** | Show only one status |
| **Star** | Starred only |
| **Revision → Due for revision** | Weak (30+ days since last revise) or starred (attempted / 30+ days) |
| **Revision → Weak · not revised 30+ days** | Weak status and not revised in 30 days |

Combine with **Theme** and **Year** (e.g. weak Polity questions).

---

## Revise today panel

At the top of Questions view: up to **5** items due for revision on the current paper.

Click an item to scroll to that question.

**Due logic:**

- **Weak** and last revised ≥ 30 days ago (or never revised)
- **Starred** and status **Attempted**, or last revised ≥ 30 days ago

---

## Answer timer (GS only)

On each GS question: **7m · 10m · 15m** buttons.

Write your answer in the notes fields while the timer runs. **Stop** cancels early.

Not saved — practice only.

---

## Search your notes

Search box matches **question text** and **your synced notes** (all note fields + status label).

Example: search `Jordan form`, `Article 356`, `Laxmikanth`.

---

## Export backup

Header → **Export notes**:

- **Download JSON** — full backup for restore/scripts
- **Download Markdown** — readable export of theme + question notes

---

## Full paper view

**View → Full paper** shows every question from **one exam year** in order (Q.1, Q.2, …) on a single scroll — closer to sitting the paper than filtering one card at a time.

Pick the year from the dropdown (e.g. **2023 GS II**). Status, stars, notes, and timers work the same as Questions view.

---

## Recent questions

**Questions** and **Full paper** views show a **Recent** strip (last 10 opened questions, stored in this browser only).

Tracked when you open notes, change status, or star a question. Click a chip to jump back.

---

## Theme / module progress

On the **Themes** (or **Modules**) grid, each card shows:

`X/Y attempted · Z weak`

Counts use synced question status. Helps spot neglected modules (e.g. PDE, LP) at a glance.

---

## GitHub upload (owner only)

Image upload/delete via **Connect GitHub** is restricted to the repo owner (`sauravanandb2w` by default). Other GitHub accounts see **GitHub ⚠** and cannot upload.

Set `GITHUB_UPLOAD_ALLOWED_USER` in `js/config.js` if needed.

Works with Supabase (cloud) or local-only storage.

---

## Database migration (existing Supabase projects)

Run once in Supabase SQL Editor (see `supabase/schema.sql`):

```sql
alter table public.question_notes
  add column if not exists study_status text not null default 'not-started';
alter table public.question_notes
  add column if not exists bookmarked boolean not null default false;
alter table public.question_notes
  add column if not exists status_updated_at timestamptz;
alter table public.question_notes
  add column if not exists last_revised_at timestamptz;
```

Without these columns, status/bookmarks save locally only until migration is run.

---

## Related docs

- **`IMAGE_UPLOAD_SERVICE.md`** — upload/delete diagrams & solution scans
- **`SUPABASE_SETUP.md`** — sign-in for synced notes
