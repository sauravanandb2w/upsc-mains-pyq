/**
 * Upload study images to GitHub repo via Contents API (commits to main).
 */

import { getGitHubRepo, getGitHubToken, isGitHubUploadAllowed } from "./github-auth.js";

const API = "https://api.github.com";
const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

async function assertUploadAllowed() {
  if (!(await isGitHubUploadAllowed())) {
    throw new Error("Image upload is restricted to the repo owner (sauravanandb2w).");
  }
}

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function slugify(name) {
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return base || "image";
}

function normalizeExt(file) {
  let ext = (file.name.match(/\.[^.]+$/)?.[0] || ".jpg").toLowerCase();
  if (ext === ".jpeg") ext = ".jpg";
  if (!VALID_EXT.has(ext)) ext = ".jpg";
  return ext;
}

async function bufferToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function encodeRepoPath(path) {
  return path
    .replace(/^\//, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

function decodeFileContent(data) {
  if (data.encoding !== "base64") return data.content ?? null;
  try {
    return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
  } catch {
    return null;
  }
}

export async function getRepoFile(path) {
  const token = getGitHubToken();
  const { owner, name } = await getGitHubRepo();
  if (!token || !owner || !name) throw new Error("Connect GitHub first.");

  const res = await fetch(`${API}/repos/${owner}/${name}/contents/${encodeRepoPath(path)}`, {
    headers: apiHeaders(token),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub read failed (${res.status})`);
  }

  const data = await res.json();
  const text = decodeFileContent(data);
  return { sha: data.sha, text, raw: data };
}

/** SHA only — safe for binary images (no UTF-8 decode). */
async function getRepoFileSha(path) {
  const token = getGitHubToken();
  const { owner, name } = await getGitHubRepo();
  if (!token || !owner || !name) throw new Error("Connect GitHub first.");

  const res = await fetch(`${API}/repos/${owner}/${name}/contents/${encodeRepoPath(path)}`, {
    headers: apiHeaders(token),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub read failed (${res.status})`);
  }

  const data = await res.json();
  return data.sha;
}

export async function putRepoFile(path, base64Content, message, sha = null) {
  const token = getGitHubToken();
  const { owner, name } = await getGitHubRepo();
  if (!token || !owner || !name) throw new Error("Connect GitHub first.");

  const body = { message, content: base64Content, branch: "main" };
  if (sha) body.sha = sha;

  const res = await fetch(`${API}/repos/${owner}/${name}/contents/${encodeRepoPath(path)}`, {
    method: "PUT",
    headers: { ...apiHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub upload failed (${res.status})`);
  }

  return res.json();
}

export async function deleteRepoFile(path, sha, message) {
  const token = getGitHubToken();
  const { owner, name } = await getGitHubRepo();
  if (!token || !owner || !name) throw new Error("Connect GitHub first.");

  const res = await fetch(`${API}/repos/${owner}/${name}/contents/${encodeRepoPath(path)}`, {
    method: "DELETE",
    headers: { ...apiHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: "main" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub delete failed (${res.status})`);
  }

  return res.json();
}

function basename(path) {
  return path.replace(/^\.\//, "").split("/").pop() || path;
}

function removeImageEntry(images, targetFile) {
  const key = basename(targetFile);
  return (images || []).filter((item) => {
    const file = typeof item === "string" ? item : item?.file;
    if (!file) return true;
    return file !== targetFile && basename(file) !== key;
  });
}

function removeSolutionEntry(entries, targetFile) {
  const key = basename(targetFile);
  return (entries || []).filter((item) => {
    const file = typeof item === "string" ? item : item?.file;
    if (!file) return true;
    return file !== targetFile && basename(file) !== key;
  });
}

async function loadManifest(questionOrThemePath) {
  const manifestPath = `${questionOrThemePath}/manifest.json`;
  const file = await getRepoFile(manifestPath);
  if (!file) return { path: manifestPath, sha: null, data: { images: [] } };
  try {
    return { path: manifestPath, sha: file.sha, data: JSON.parse(file.text) };
  } catch {
    return { path: manifestPath, sha: file.sha, data: { images: [] } };
  }
}

async function saveManifest(manifestPath, sha, data, commitMessage) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2) + "\n")));
  await putRepoFile(manifestPath, content, commitMessage, sha);
}

function nextSolutionFilename(manifest, part, ext) {
  const listed = manifest.solutions?.[part] || [];
  const nums = [];
  for (const item of listed) {
    const file = typeof item === "string" ? item : item?.file || "";
    const m = file.match(new RegExp(`part-${part}-(\\d+)`, "i"));
    if (m) nums.push(Number(m[1]));
  }
  let n = nums.length ? Math.max(...nums) + 1 : 1;
  return `part-${part}-${String(n).padStart(2, "0")}${ext}`;
}

function rel(path) {
  return path.replace(/^\.\//, "");
}

/** Upload image to study/questions/{id}/ and append to manifest.images */
export async function uploadQuestionStudyImage(questionId, file) {
  await assertUploadAllowed();
  const ext = normalizeExt(file);
  const destName = `${slugify(file.name)}${ext}`;
  const folder = `study/questions/${questionId}`;
  const filePath = `${folder}/${destName}`;

  const manifest = await loadManifest(folder);
  const images = manifest.data.images || [];
  const listed = images.map((i) => (typeof i === "string" ? i : i?.file)).filter(Boolean);
  if (!listed.includes(destName)) {
    manifest.data.images = [...images, destName];
  }

  const b64 = await bufferToBase64(file);
  await putRepoFile(filePath, b64, `Add study image ${questionId}/${destName}`);
  await saveManifest(manifest.path, manifest.sha, manifest.data, `Update manifest ${questionId}`);

  return { path: filePath, name: destName };
}

/** Upload math solution scan to solutions/ and manifest.solutions[part] */
export async function uploadMathSolutionScan(questionId, part, file) {
  await assertUploadAllowed();
  const ext = normalizeExt(file);
  const folder = `study/questions/${questionId}`;
  const manifest = await loadManifest(folder);
  const destName = nextSolutionFilename(manifest.data, part, ext);
  const relPath = rel(`solutions/${destName}`);
  const filePath = `${folder}/${relPath}`;

  manifest.data.solutions = manifest.data.solutions || {};
  const arr = manifest.data.solutions[part] || [];
  if (!arr.some((i) => (typeof i === "string" ? i : i?.file) === relPath)) {
    manifest.data.solutions[part] = [...arr, relPath];
  }

  const b64 = await bufferToBase64(file);
  await putRepoFile(filePath, b64, `Add ${questionId} part (${part}) solution scan`);
  await saveManifest(manifest.path, manifest.sha, manifest.data, `Update ${questionId} solutions manifest`);

  return { path: filePath, name: destName };
}

/** Upload image to study/themes/{themeId}/ or study/modules/{moduleId}/ */
export async function uploadThemeStudyImage(studyPath, file, caption = "") {
  await assertUploadAllowed();
  const ext = normalizeExt(file);
  const destName = `${slugify(file.name)}${ext}`;
  const filePath = `${studyPath}/${destName}`;

  const manifest = await loadManifest(studyPath);
  const images = manifest.data.images || [];
  const exists = images.some((i) => (typeof i === "string" ? i : i?.file) === destName);
  if (!exists) {
    const entry = caption ? { file: destName, caption } : destName;
    manifest.data.images = [...images, entry];
  }

  const b64 = await bufferToBase64(file);
  await putRepoFile(filePath, b64, `Add study image ${studyPath}/${destName}`);
  await saveManifest(manifest.path, manifest.sha, manifest.data, `Update manifest ${studyPath}`);

  return { path: filePath, name: destName };
}

/** Delete image from study/questions/{id}/ and remove from manifest.images */
export async function deleteQuestionStudyImage(questionId, fileName) {
  await assertUploadAllowed();
  const cleanName = basename(fileName);
  const folder = `study/questions/${questionId}`;
  const filePath = `${folder}/${cleanName}`;

  const fileSha = await getRepoFileSha(filePath);
  if (!fileSha) throw new Error("Image not found in repo.");

  const manifest = await loadManifest(folder);
  manifest.data.images = removeImageEntry(manifest.data.images, cleanName);

  await deleteRepoFile(filePath, fileSha, `Remove study image ${questionId}/${cleanName}`);
  await saveManifest(manifest.path, manifest.sha, manifest.data, `Update manifest ${questionId}`);
  return { path: filePath, name: cleanName };
}

/** Delete math solution scan and remove from manifest.solutions[part] */
export async function deleteMathSolutionScan(questionId, part, relFile) {
  await assertUploadAllowed();
  const clean = relFile.replace(/^\.\//, "");
  const folder = `study/questions/${questionId}`;
  const filePath = clean.startsWith("solutions/") ? `${folder}/${clean}` : `${folder}/solutions/${clean}`;

  const fileSha = await getRepoFileSha(filePath);
  if (!fileSha) throw new Error("Solution scan not found in repo.");

  const manifest = await loadManifest(folder);
  manifest.data.solutions = manifest.data.solutions || {};
  manifest.data.solutions[part] = removeSolutionEntry(manifest.data.solutions[part], clean);

  await deleteRepoFile(filePath, fileSha, `Remove ${questionId} part (${part}) solution scan`);
  await saveManifest(manifest.path, manifest.sha, manifest.data, `Update ${questionId} solutions manifest`);
  return { path: filePath, file: clean };
}

/** Delete image from study/themes/ or study/modules/ */
export async function deleteThemeStudyImage(studyPath, fileName) {
  await assertUploadAllowed();
  const cleanName = basename(fileName);
  const filePath = `${studyPath}/${cleanName}`;

  const fileSha = await getRepoFileSha(filePath);
  if (!fileSha) throw new Error("Image not found in repo.");

  const manifest = await loadManifest(studyPath);
  manifest.data.images = removeImageEntry(manifest.data.images, cleanName);

  await deleteRepoFile(filePath, fileSha, `Remove study image ${studyPath}/${cleanName}`);
  await saveManifest(manifest.path, manifest.sha, manifest.data, `Update manifest ${studyPath}`);
  return { path: filePath, name: cleanName };
}
