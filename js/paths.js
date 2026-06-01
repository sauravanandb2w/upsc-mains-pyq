/** Resolve repo-root paths for GitHub Pages (/repo-name/) and local dev. */

let repoBaseCache = null;

export function repoBase() {
  if (repoBaseCache !== null) return repoBaseCache;

  const script = document.querySelector('script[src*="app.js"]');
  if (script?.src) {
    try {
      const url = new URL(script.src, location.href);
      const base = url.pathname.replace(/\/js\/app\.js.*$/, "");
      repoBaseCache = base === "/" ? "" : base;
      return repoBaseCache;
    } catch {
      /* fall through */
    }
  }

  repoBaseCache = "";
  return repoBaseCache;
}

/** Turn `study/questions/foo.jpg` into a URL that works on GitHub Pages and locally. */
export function assetUrl(relativePath) {
  const raw = String(relativePath || "");
  const qIndex = raw.indexOf("?");
  const pathPart = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const query = qIndex >= 0 ? raw.slice(qIndex) : "";
  const path = pathPart.replace(/^\//, "");
  const base = repoBase();
  const resolved = base ? `${base}/${path}`.replace(/\/+/g, "/") : path;
  return `${resolved}${query}`;
}
