# Supabase setup — synced notes (phone + laptop)

Follow these steps once to enable cloud sync for theme notes and per-question notes.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is enough).
2. **New project** → pick a name, password, region (choose closest to India, e.g. Mumbai/Singapore).
3. Wait ~2 minutes for the project to provision.

## 2. Run the database schema

1. In Supabase dashboard → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy all SQL, paste, and **Run**.
3. You should see success — two tables: `theme_notes`, `question_notes`.

## 3. Enable auth providers

### Email + password (required)

1. **Authentication** → **Providers** → **Email**.
2. Ensure **Enable Email provider** is on.
3. For quick testing you can disable **Confirm email** under Email settings (re-enable for production).

### Google (optional, recommended for mobile)

1. **Authentication** → **Providers** → **Google** → Enable.
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - OAuth client type: **Web application**
   - Authorized redirect URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
3. Paste Client ID and Client Secret into Supabase Google provider settings.

## 4. Add redirect URLs (for deployed site)

1. **Authentication** → **URL Configuration**.
2. **Site URL**: your live URL, e.g. `https://your-site.netlify.app` or `http://localhost:8080` for local dev.
3. **Redirect URLs** — add:
   - `http://localhost:8080`
   - `http://127.0.0.1:8080`
   - Your production URL (Netlify, GitHub Pages, etc.)

## 5. Configure the app

```bash
cp js/config.example.js js/config.js
```

Edit `js/config.js`:

```javascript
export const SUPABASE_URL = "https://abcdefgh.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbG...your-anon-key";
```

Find these in Supabase → **Project Settings** → **API**:
- **Project URL** → `SUPABASE_URL`
- **anon public** key → `SUPABASE_ANON_KEY`

Never commit `js/config.js` (it's in `.gitignore`). For GitHub Pages / Netlify, inject keys at deploy time or use a build step.

### Netlify deploy with env vars

Add environment variables in Netlify dashboard, then use a small pre-build script to write `js/config.js` — or paste keys into `config.js` only on your deployed branch if the repo is private.

## 6. Run locally

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) → **Sign in** → create account.

Use the same account on your phone browser (or add to home screen) — notes sync automatically.

## How notes are stored

| Layer | Table | Purpose |
|-------|-------|---------|
| **Themes** (main) | `theme_notes` | Brainstorm by syllabus theme — use this daily |
| **Questions** | `question_notes` | Optional per-PYQ notes |

Row Level Security ensures each user only reads/writes their own rows.

On first sign-in, any notes previously saved in browser localStorage are merged into your cloud account.

## Day-to-day use (phone + laptop)

1. **Sign in** with the same account on every device (email or Google).
2. **Type in a note field** — it saves to this browser and uploads to Supabase after a short pause (~½–1 s). You do not need to click **Sync notes** for normal edits.
3. **Open the app on another device** — sign in, wait a moment, or switch away and back to the tab; cloud notes download automatically.
4. **Sync notes** (header button) — optional “catch up”: flush pending edits, push local notes that have content, then pull everything from the cloud. Use if two devices feel out of date.

**Themes** tab = main brainstorm (by syllabus theme). **Questions** tab = per-PYQ notes (and Math parts a–e). All use the same Supabase tables when signed in.

### Text formatting

Each note box has a small toolbar: **bold**, *italic*, underline, strikethrough, bullet/numbered lists, and clear formatting. Shortcuts: **Ctrl+B**, **Ctrl+I**, **Ctrl+U** (Cmd on Mac). Formatting is stored as safe HTML in the same note columns and syncs like plain text. Old plain-text notes still work unchanged.

---

## Field locks (padlock on each note box)

Each note field has a **padlock** on the right:

| Icon | Meaning |
|------|---------|
| **Open padlock** | Unlocked — edits **sync** to other devices |
| **Closed padlock** | Locked — text is **frozen** at lock time; further typing on that field does **not** upload |

Lock state is stored in Supabase as `locked_fields` on the same row as the note. **The cloud is the source of truth** — all signed-in devices should show the same locked/unlocked icon after sync.

### Typical workflows

**Keep drafting on one device (sync everywhere)**  
Leave the field **unlocked**. Type on laptop or phone; the other device picks it up on sign-in or tab focus.

**Freeze a finished block (e.g. static notes done)**  
Click the padlock → **closed**. That snapshot is saved locally and in the cloud. You can still edit on *this* screen, but changes will **not** sync until you unlock.

**Unlock → edit → lock again**  
1. Click **open padlock** (unlock) — lock state syncs; field accepts live edits again.  
2. Change the text — with the field **unlocked**, edits auto-sync like any other field.  
3. Click **closed padlock** (lock) — a **new snapshot** is taken from the current text and synced. Other devices see the updated frozen text and a locked icon.

So: **unlock = resume syncing**; **lock = freeze current text and stop syncing** that field.

### What does *not* sync while locked

- New typing in that **same** field (until you unlock).
- Other **unlocked** fields on the same theme/question still sync normally.

### Multi-device checklist

| You did this | Other device should… |
|--------------|----------------------|
| Locked a field | Show **closed** padlock after refresh / tab focus (~1 s) |
| Unlocked a field | Show **open** padlock; live text from cloud for that field |
| Typed in **unlocked** field | Show new text after pull |
| Typed in **locked** field | Still show last **snapshot** (not your new typing) |

If icons disagree, hard-refresh both browsers, sign in again, and unlock/lock once on the device you trust.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Configure js/config.js" | Copy `config.example.js` → `config.js` and add keys |
| Sign up works but can't sign in | Check email confirmation or disable confirm in Supabase |
| Google login fails | Add redirect URL in Supabase + Google OAuth console |
| **`Could not find the 'bookmarked' column`** or **`locked_fields`** | Run **`supabase/migrate-existing-project.sql`** in Supabase → SQL Editor (see below) |
| Notes don't sync | Check browser console; verify schema SQL ran successfully |
| Lock icon differs on two devices | Hard-refresh both; run migration SQL if `locked_fields` errors; wait for tab-focus pull or tap **Sync notes** |
| Unlocked field went blank on new browser | Fixed in app v2025+ — pull runs before push on sign-in; hard-refresh after deploy |
| CORS / fetch errors | Use `http.server`, not `file://` |

### Fix: `bookmarked`, `locked_fields`, or `study_status` column missing

If the app shows **Cloud save failed** and mentions `bookmarked` (or `study_status`) in the schema cache, the project was created from an **old** schema. The app still saves notes **locally**; only cloud sync fails until you migrate:

1. Open [Supabase](https://supabase.com) → your project → **SQL Editor** → **New query**.
2. Copy all of [`supabase/migrate-existing-project.sql`](supabase/migrate-existing-project.sql) and **Run**.
3. Wait ~1 minute (schema cache refresh), then hard-refresh the PYQ app and try again.

You do **not** need to change the app code or click **Sync notes** for every edit after this — only run the SQL once.

## Security notes

- The **anon** key is safe to use in frontend code (it's public by design).
- Never put the **service_role** key in the app.
- RLS policies in `schema.sql` protect user data.
