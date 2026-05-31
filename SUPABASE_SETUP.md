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

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Configure js/config.js" | Copy `config.example.js` → `config.js` and add keys |
| Sign up works but can't sign in | Check email confirmation or disable confirm in Supabase |
| Google login fails | Add redirect URL in Supabase + Google OAuth console |
| Notes don't sync | Check browser console; verify schema SQL ran successfully |
| CORS / fetch errors | Use `http.server`, not `file://` |

## Security notes

- The **anon** key is safe to use in frontend code (it's public by design).
- Never put the **service_role** key in the app.
- RLS policies in `schema.sql` protect user data.
