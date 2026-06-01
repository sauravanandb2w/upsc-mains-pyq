# Image upload service — user guide

Upload and delete study images **from the web app** (phone or laptop). Images are stored in **git** and served via **GitHub Pages**. Text notes still sync via **Supabase**.

Live app: https://sauravanandb2w.github.io/upsc-mains-pyq/

Technical setup (OAuth, Supabase function, secrets): **`GITHUB_UPLOAD_SETUP.md`**

---

## How it works (architecture)

```
┌─────────────────┐     Sign in      ┌──────────────────┐
│  Your browser   │ ───────────────► │  GitHub OAuth    │
│  (the app)      │ ◄─────────────── │  (authorize)     │
└────────┬────────┘     token        └──────────────────┘
         │
         │  Upload / delete image
         ▼
┌─────────────────┐     Contents API ┌──────────────────┐
│  GitHub API     │ ───────────────► │  upsc-mains-pyq  │
│  (your token)   │   commit main    │  repo on GitHub  │
└─────────────────┘                  └────────┬─────────┘
                                              │
                                              ▼
                                     GitHub Pages deploy
                                     (~1–2 min) → image live
```

| Data | Where it lives | How it syncs |
|------|----------------|--------------|
| Text notes (approach, tricks, best answer) | Supabase | **Sign in** (email / Google) |
| Images (diagrams, solution scans) | `study/` in git | **Connect GitHub** in header |
| Official math PYQ question scans | `study/questions/math*/scan-*.jpg` | Added by script / git (read-only in app) |

**Two separate sign-ins:**

- **Sign in** — Supabase account for notes
- **Connect GitHub** / **GitHub ✓** — permission to commit images to your repo

---

## One-time setup (admin)

Do this once per repo / device:

1. Create a **GitHub OAuth App** (callback URL must include `/upsc-mains-pyq/oauth/github-callback.html`).
2. Add **GitHub Actions secrets**: `GH_OAUTH_CLIENT_ID`, `GH_REPO_OWNER`, `GH_REPO_NAME`.
3. Deploy **Supabase edge function** `github-oauth` (token exchange).
4. Redeploy GitHub Pages after adding secrets.

Full steps: **`GITHUB_UPLOAD_SETUP.md`**

On each device/browser: open the app → **Connect GitHub** → Authorize.

---

## General Studies (GS I–IV)

### A. Per-question diagrams & maps

Use for: flowcharts, maps, tables, extra diagrams tied to one PYQ.

1. **General Studies** → pick paper (e.g. GS I).
2. **Questions** view → open a question.
3. Expand **Diagrams & images**.
4. **Upload image to git** → choose JPG/PNG.
5. After ~1–2 min, hard-refresh — image appears in the gallery.

**Repo path:** `study/questions/gs1-2024-q1/` (example)

**Delete:** hover the image → click **×** (top-right). Confirm. Requires **GitHub ✓**.

### B. Theme-level study sheets

Use for: theme-wide diagrams, comparison tables, revision sheets shared across many PYQs.

1. **Themes** view → open a theme (e.g. Constitution & Polity).
2. Expand **Study materials — diagrams · tables · flowcharts**.
3. **Upload study image**.

**Repo path:** `study/themes/{theme-id}/`

**Delete:** **×** on the image (with **GitHub ✓** connected).

### C. Text notes (unchanged)

Under **Your notes for this question** — synced via **Sign in**, not GitHub.

---

## Mathematics Optional (Paper I & II)

### A. Official question scans (read-only)

Math PYQs show as **PDF scan cutouts** from `study/questions/math1-2024-q1/scan-*.jpg`. These come from the fetch script / git, not from the upload button.

### B. Handwritten solution scans (parts a–e)

Use for: your handwritten solutions, one or more pages per part.

1. **Mathematics Optional** → Paper I or II.
2. **Questions** → open a question.
3. Expand **Your notes — parts (a) to (e)**.
4. Open **Part (a)** (or b, c, d, e).
5. **Upload solution photo** → photo of your solution.
6. Upload again for page 2 — auto-names `part-a-02.jpg`, etc.

**Repo path:** `study/questions/math1-2024-q1/solutions/part-a-01.jpg`

**Delete:** **×** on the solution image (with **GitHub ✓**).

### C. Module study materials

Use for: standard results, derivations, trick sheets for a syllabus module.

1. **Themes** view (math shows modules) → open a module.
2. **Study materials** panel → **Upload study image**.

**Repo path:** `study/modules/{module-id}/`

**Delete:** **×** on the image.

### D. Per-part text notes (unchanged)

Fields like **Approach**, **Standard results used**, **Mistakes** sync via **Sign in** (Supabase), same as GS notes.

---

## Upload & delete reference

| Action | Requirement | Visible after |
|--------|-------------|---------------|
| Upload | **GitHub ✓** | ~1–2 min (Pages deploy) |
| Delete **×** | **GitHub ✓** + confirm dialog | ~1–2 min |
| Disconnect GitHub | Click **GitHub ✓** in header | Stops upload/delete on this device |

**Supported formats:** JPG, PNG, WebP, GIF (JPG recommended for scans).

**File size:** keep under ~2 MB when possible for mobile speed.

---

## What happens in git on upload

Example GS question upload:

```
study/questions/gs1-2024-q1/
  my-diagram.jpg          ← new file
  manifest.json           ← filename added to "images" array
```

Example math solution upload:

```
study/questions/math1-2024-q1/
  solutions/part-a-01.jpg
  manifest.json           ← "solutions": { "a": ["solutions/part-a-01.jpg"] }
```

Each upload/delete creates a **commit on `main`**. GitHub Actions redeploys Pages automatically.

---

## manifest.json (for reference)

**GS / theme / extra question images:**

```json
{
  "images": [
    "diagram.png",
    { "file": "map.jpg", "caption": "River systems" }
  ]
}
```

**Math solution scans:**

```json
{
  "solutions": {
    "a": ["solutions/part-a-01.jpg", "solutions/part-a-02.jpg"],
    "b": ["solutions/part-b-01.jpg"]
  }
}
```

The app updates this file for you on upload/delete. Manual edits in git also work.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No **Connect GitHub** button | Add `GH_OAUTH_CLIENT_ID` secret → redeploy Pages |
| **Failed to fetch** on login | Deploy `github-oauth` Supabase function (`--use-api`) |
| **redirect_uri** error | OAuth callback must be `…/upsc-mains-pyq/oauth/github-callback.html` |
| Upload works, image missing | Wait 2 min, hard-refresh (Cmd+Shift+R) |
| No **×** delete button | Connect GitHub (**GitHub ✓** must show) |
| Delete fails 404 | File already removed in git — refresh page |
| 403 on upload/delete | Re-connect GitHub; OAuth scope needs `public_repo` |

---

## CLI alternatives (optional)

Prefer the app when possible. For bulk or scripted work:

| Task | Command / doc |
|------|----------------|
| Add math solution scan | `python3 scripts/add-solution-scan.py math1-2024-q1 a ~/photo.jpg` |
| General image workflow | **`ADDING_IMAGES.md`** |
| OAuth / deploy setup | **`GITHUB_UPLOAD_SETUP.md`** |

---

## Security notes

- OAuth **client secret** stays in Supabase secrets only (never in the repo).
- GitHub token is stored in **your browser** (`localStorage`) after Connect GitHub.
- Uploads/commits run as **your** GitHub user to **your** repo.
- Disconnect via **GitHub ✓** in the header to remove the token on that device.
