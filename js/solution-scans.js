/**
 * Handwritten solution scans for math PYQ parts (a)–(e).
 * - Repo images: study/questions/{qid}/solutions/part-{a}.jpg (or manifest.json → solutions)
 * - Local photos: IndexedDB on this device (not synced to Supabase)
 */

import { assetUrl } from "./paths.js";

const DB_NAME = "upsc-pyq-solution-scans-v1";
const STORE = "scans";
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("questionPart", ["questionId", "part"], { unique: false });
      }
    };
  });
  return dbPromise;
}

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

/** @returns {Promise<Array<{ src: string, label: string, kind: 'repo' }>>} */
export async function loadRepoSolutionScans(questionId, part) {
  const base = `study/questions/${questionId}`;
  const manifest = await tryFetchJson(`${base}/manifest.json`);
  const fromManifest = manifest?.solutions?.[part];
  const candidates = [];

  if (Array.isArray(fromManifest)) {
    for (const item of fromManifest) {
      const file = typeof item === "string" ? item : item?.file;
      if (file) candidates.push(file);
    }
  }

  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    candidates.push(`solutions/part-${part}.${ext}`);
  }

  const seen = new Set();
  const out = [];
  for (const file of candidates) {
    const rel = file.startsWith("solutions/") ? `${base}/${file}` : `${base}/${file.replace(/^\.\//, "")}`;
    if (seen.has(rel)) continue;
    seen.add(rel);
    if (await imageExists(rel)) {
      out.push({
        src: assetUrl(rel),
        label: `Repo scan · part (${part})`,
        kind: "repo",
      });
    }
  }
  return out;
}

export async function listLocalSolutionScans(questionId, part) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index("questionPart");
    const req = index.getAll([questionId, part]);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalSolutionScan(questionId, part, file) {
  const id = `${questionId}-${part}-${Date.now()}`;
  const db = await openDb();
  const record = {
    id,
    questionId,
    part,
    name: file.name || "solution.jpg",
    type: file.type || "image/jpeg",
    addedAt: new Date().toISOString(),
    blob: file,
  };

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(record);
  });

  return { id, name: record.name, addedAt: record.addedAt };
}

export async function deleteLocalSolutionScan(scanId) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(scanId);
  });
}

export async function getLocalScanObjectUrl(scanId) {
  const db = await openDb();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(scanId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  if (!record?.blob) return null;
  return URL.createObjectURL(record.blob);
}

/** @returns {Promise<Array<{ src: string, label: string, kind: 'local', id: string }>>} */
export async function loadLocalSolutionScanUrls(questionId, part) {
  const rows = await listLocalSolutionScans(questionId, part);
  const out = [];
  for (const row of rows) {
    const src = await getLocalScanObjectUrl(row.id);
    if (src) {
      out.push({
        id: row.id,
        src,
        label: row.name || "Your solution photo",
        kind: "local",
      });
    }
  }
  return out;
}

export function revokeObjectUrls(urls) {
  for (const u of urls) {
    if (u.startsWith("blob:")) URL.revokeObjectURL(u);
  }
}
