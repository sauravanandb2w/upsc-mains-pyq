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

  // GitHub Pages project site (/owner.github.io/repo-name/...) — e.g. oauth callback page
  if (location.hostname.endsWith(".github.io")) {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length >= 1 && parts[0] !== "oauth") {
      repoBaseCache = `/${parts[0]}`;
      return repoBaseCache;
    }
  }

  repoBaseCache = "";
  return repoBaseCache;
}

function githubRepoSlugForCdn() {
  const meta = document.querySelector('meta[name="pyq-github-repo"]');
  if (meta?.content?.trim()) return meta.content.trim();
  const base = repoBase();
  if (!base) return null;
  const repo = base.replace(/^\//, "");
  if (!repo) return null;
  return `sauravanandb2w/${repo}`;
}

function githubBranchForCdn() {
  return document.querySelector('meta[name="pyq-github-branch"]')?.content?.trim() || "main";
}

/**
 * jsDelivr serves study assets from the GitHub repo (avoids GitHub Pages 429 on many images).
 */
function jsdelivrStudyUrl(path, query = "") {
  const slug = githubRepoSlugForCdn();
  if (!slug) return null;
  return `https://cdn.jsdelivr.net/gh/${slug}@${githubBranchForCdn()}/${path}${query}`;
}

/** Turn `study/questions/foo.jpg` into a URL that works on GitHub Pages and locally. */
export function assetUrl(relativePath) {
  const raw = String(relativePath || "");
  const qIndex = raw.indexOf("?");
  const pathPart = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const query = qIndex >= 0 ? raw.slice(qIndex) : "";
  const path = pathPart.replace(/^\//, "");

  if (
    typeof location !== "undefined" &&
    location.hostname.endsWith(".github.io") &&
    path.startsWith("study/")
  ) {
    const cdn = jsdelivrStudyUrl(path, query);
    if (cdn) return cdn;
  }

  const base = repoBase();
  const resolved = base ? `${base}/${path}`.replace(/\/+/g, "/") : path;
  return `${resolved}${query}`;
}
