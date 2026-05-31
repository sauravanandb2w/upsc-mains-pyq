# Deploy UPSC Mains PYQ online

## GitHub Pages + Supabase sync (recommended after git push)

`js/config.js` is **not in git** (contains keys). CI generates it from GitHub Secrets at deploy time.

### 1. Add repository secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|------|--------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | your anon / publishable key |

### 2. Enable GitHub Pages

1. Repo → **Settings** → **Pages**
2. **Build and deployment** → **Source** → **GitHub Actions**
3. Push to `main` — workflow deploys automatically

Site URL: **`https://sauravanandb2w.github.io/upsc-mains-pyq/`**

### 3. Supabase redirect URLs (required for sign-in on live site)

**Authentication** → **URL Configuration**:

- **Site URL:** `https://sauravanandb2w.github.io/upsc-mains-pyq/`
- **Redirect URLs** — add:
  - `https://sauravanandb2w.github.io/upsc-mains-pyq/`
  - `http://localhost:8080` (keep for local dev)

---

## Option A — Netlify Drop (fastest, no Git)

1. Zip the project (from the parent folder):

   ```bash
   cd /Users/saurav/Desktop
   zip -r upsc-mains-pyq.zip upsc-mains-pyq -x "*.DS_Store" -x "*__MACOSX*"
   ```

2. Open **[app.netlify.com/drop](https://app.netlify.com/drop)** in your browser.

3. Drag `upsc-mains-pyq.zip` onto the page.

4. Netlify gives you a live URL (e.g. `https://something-random.netlify.app`). Sign up (free) to claim a custom name like `upsc-mains-pyq.netlify.app`.

To update later: drag a new zip, or connect the folder to Git in the Netlify dashboard.

---

## Option B — GitHub Pages (good for long-term)

### 1. Create a GitHub repository

On [github.com/new](https://github.com/new), create a repo named `upsc-mains-pyq` (public).

### 2. Push this project

```bash
cd /Users/saurav/Desktop/upsc-mains-pyq
git init
git add .
git commit -m "Initial commit: UPSC Mains GS PYQ app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/upsc-mains-pyq.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### 3. Enable GitHub Pages

1. Repo → **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
3. The workflow in `.github/workflows/pages.yml` runs on every push to `main`

After the workflow finishes (Actions tab), the site is at:

**`https://YOUR_USERNAME.github.io/upsc-mains-pyq/`**

---

## Option C — Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages**
2. **Upload assets** (or connect GitHub)
3. Upload the `upsc-mains-pyq` folder contents (or the zip from Option A)
4. Build settings: **none** — publish directory is the project root

---

## Custom domain (optional)

- **Netlify / Cloudflare / GitHub Pages** all support adding a domain you own (e.g. `pyq.yourdomain.com`) in their dashboard DNS settings.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page / no questions | Host must serve over **HTTPS/HTTP**, not `file://`. Redeploy; don’t open `index.html` directly from disk on the host. |
| 404 on GitHub Pages | Wait for the Actions workflow to complete. URL must include repo name: `/upsc-mains-pyq/`. |
| Old content after update | Hard refresh (`Cmd+Shift+R`) or clear cache. |
