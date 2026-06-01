# GitHub image upload from the app

Upload study images (GS questions, GS themes, Maths solution scans) **from the portal** — files are committed to this repo via the GitHub API. After push, GitHub Pages redeploys (~1–2 minutes).

**Notes** still sync via Supabase. **Images** go to git via GitHub OAuth.

---

## 1. Create a GitHub OAuth App

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. **Application name:** `UPSC PYQ Upload` (any name)
3. **Homepage URL:** your live site, e.g. `https://sauravanandb2w.github.io/upsc-mains-pyq/`
4. **Authorization callback URL:**

   ```
   https://sauravanandb2w.github.io/upsc-mains-pyq/oauth/github-callback.html
   ```

   For local dev also add:

   ```
   http://localhost:8080/oauth/github-callback.html
   ```

5. Save **Client ID**. Generate a **Client secret** (keep private).

---

## 2. Deploy the token-exchange function (Supabase)

The browser must not contain the OAuth client secret. A small Supabase Edge Function exchanges the login code for an access token.

```bash
# Install Supabase CLI if needed: https://supabase.com/docs/guides/cli

supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase secrets set GITHUB_CLIENT_ID=your_github_oauth_client_id
supabase secrets set GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

supabase functions deploy github-oauth --no-verify-jwt
```

Function path in repo: `supabase/functions/github-oauth/index.ts`

---

## 3. Configure the app

### Local (`js/config.js`)

```javascript
export const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "your-anon-key";

export const GITHUB_OAUTH_CLIENT_ID = "Ov23li...";
export const GITHUB_REPO_OWNER = "sauravanandb2w";
export const GITHUB_REPO_NAME = "upsc-mains-pyq";
export const GITHUB_OAUTH_SCOPE = "public_repo";
```

- **`public_repo`** — enough if this repo is **public**
- Use **`repo`** if the repository is private

`GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` are auto-detected on GitHub Pages when omitted.

### GitHub Actions (production)

Add repository **Secrets** (names must **not** start with `GITHUB_` — that prefix is reserved by GitHub Actions):

| Secret | Value |
|--------|--------|
| `SUPABASE_URL` | (already used for notes) |
| `SUPABASE_ANON_KEY` | (already used) |
| `GH_OAUTH_CLIENT_ID` | OAuth App Client ID |
| `GH_REPO_OWNER` | `sauravanandb2w` |
| `GH_REPO_NAME` | `upsc-mains-pyq` |
| `GH_OAUTH_SCOPE` | `public_repo` (optional; default if omitted) |

Update `scripts/generate-config.sh` runs on deploy and writes `js/config.js`.

---

## 4. Use in the app

1. Open the site → **Connect GitHub** (header)
2. Approve access to your repo
3. Upload:
   - **Maths:** each part (a)–(e) → **Upload solution photo**
   - **GS question:** **Diagrams & images** → **Upload image to git**
   - **GS theme / Maths module:** study materials panel → **Upload study image**

Each upload creates a commit on `main`. GitHub Actions deploys Pages automatically.

---

## 5. Troubleshooting

| Issue | Fix |
|-------|-----|
| No **Connect GitHub** button | Set `GITHUB_OAUTH_CLIENT_ID` + Supabase keys in `config.js` |
| OAuth callback error | Callback URL must match OAuth App exactly (including `/oauth/github-callback.html`) |
| Token exchange failed | Deploy `github-oauth` function; set Supabase secrets |
| 403 on upload | Re-authorize; scope must include `public_repo` or `repo` |
| Image not visible yet | Wait for GitHub Pages deploy (~1–2 min); hard-refresh |

---

## Security

- OAuth **client secret** lives only in Supabase secrets, not in the repo.
- Access token is stored in your browser (`localStorage`) — disconnect via **GitHub ✓** in the header.
- Commits go to **your** repo under **your** GitHub account.
