/**
 * Handwritten solution scans for math PYQ parts (a)–(e).
 * Stored in git under study/questions/{qid}/solutions/ — synced via push to GitHub Pages.
 */

import { assetUrl } from "./paths.js";

async function tryFetchJson(url) {
  try {
    const res = await fetch(assetUrl(url), { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function imageExists(url) {
  try {
    const res = await fetch(assetUrl(url), { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function normalizeSolutionEntries(fromManifest) {
  if (!fromManifest) return [];
  const list = Array.isArray(fromManifest) ? fromManifest : [fromManifest];
  const out = [];
  for (const item of list) {
    if (typeof item === "string") {
      out.push({ file: item, caption: "" });
    } else if (item?.file) {
      out.push({ file: item.file, caption: item.caption || "" });
    }
  }
  return out;
}

/** @returns {Promise<Array<{ src: string, label: string, kind: 'repo', file: string }>>} */
export async function loadRepoSolutionScans(questionId, part) {
  const base = `study/questions/${questionId}`;
  const manifest = await tryFetchJson(`${base}/manifest.json`);
  let entries = normalizeSolutionEntries(manifest?.solutions?.[part]);

  if (!entries.length) {
    for (const ext of ["jpg", "jpeg", "png", "webp"]) {
      entries.push({ file: `solutions/part-${part}.${ext}`, caption: "" });
    }
  }

  const seen = new Set();
  const out = [];

  for (const { file, caption } of entries) {
    const clean = file.replace(/^\.\//, "");
    const rel = clean.startsWith("solutions/") ? `${base}/${clean}` : `${base}/solutions/${clean}`;
    if (seen.has(rel)) continue;
    seen.add(rel);

    if (await imageExists(rel)) {
      out.push({
        src: assetUrl(rel),
        label: caption || `Solution · part (${part})`,
        kind: "repo",
        file: clean,
      });
    }
  }

  return out;
}

export function solutionScanGitCommand(questionId, part) {
  return `python3 scripts/add-solution-scan.py ${questionId} ${part} ~/path/to/photo.jpg`;
}
