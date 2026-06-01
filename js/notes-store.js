import {
  parseLockKey,
  questionFieldLockKey,
  themeFieldLockKey,
} from "./field-locks.js";

export { themeFieldLockKey, questionFieldLockKey } from "./field-locks.js";

export const THEME_NOTE_FIELDS = [
  {
    id: "brainstorm",
    db: "brainstorm",
    label: "Brainstorm",
    placeholder: "Free-form ideas, angles, linkages across PYQs…",
  },
  {
    id: "staticNotes",
    db: "static_notes",
    label: "Static notes",
    placeholder: "Core syllabus content, facts, diagrams…",
  },
  {
    id: "quotes",
    db: "quotes",
    label: "Quotes",
    placeholder: "Thinkers, committees, constitutional quotes…",
  },
  {
    id: "currentAffairs",
    db: "current_affairs",
    label: "Current affairs",
    placeholder: "Recent events, reports, schemes…",
  },
  {
    id: "valueMaterial",
    db: "value_material",
    label: "Value material",
    placeholder: "Cases, data, examples, maps…",
  },
];

export const QUESTION_NOTE_FIELDS = [
  {
    id: "introduction",
    db: "introduction",
    label: "Introduction",
    placeholder: "Your intro hook, context, definition…",
  },
  {
    id: "staticNotes",
    db: "static_notes",
    label: "Static notes",
    placeholder: "Core syllabus content, facts, diagrams…",
  },
  {
    id: "quotes",
    db: "quotes",
    label: "Quotes",
    placeholder: "Thinkers, committees, constitutional quotes…",
  },
  {
    id: "currentAffairs",
    db: "current_affairs",
    label: "Current affairs",
    placeholder: "Link recent events (year-specific)…",
  },
  {
    id: "topperPoints",
    db: "topper_points",
    label: "Topper points",
    placeholder: "Structure, presentation, high-scoring angles…",
  },
  {
    id: "valueMaterial",
    db: "value_material",
    label: "Value material",
    placeholder: "Cases, reports, data, maps, examples…",
  },
];

/** Maths optional — module revision workspace (Paper I = 5, Paper II = 6). */
export const MATH_MODULE_NOTE_FIELDS = [
  {
    id: "standardResults",
    db: "brainstorm",
    label: "Standard results",
    placeholder: "Formulas, theorems, standard limits — type what you must memorize…",
  },
  {
    id: "derivations",
    db: "static_notes",
    label: "Key derivations",
    placeholder: "Steps for proofs you must reproduce in the exam…",
  },
  {
    id: "tricks",
    db: "quotes",
    label: "Tricks & shortcuts",
    placeholder: "Patterns, substitutions, quick checks from your coaching notes…",
  },
  {
    id: "difficultQuestions",
    db: "current_affairs",
    label: "Important / difficult questions",
    placeholder: "PYQ list, year-wise tough problems, why each is hard…",
  },
  {
    id: "revisionChecklist",
    db: "value_material",
    label: "Revision checklist",
    placeholder: "Topics done · reattempt dates · weak areas…",
  },
];

export const MATH_QUESTION_NOTE_FIELDS = [
  {
    id: "approach",
    db: "introduction",
    label: "Solution approach",
    placeholder: "Outline of steps before full write-up…",
  },
  {
    id: "standardResultsUsed",
    db: "static_notes",
    label: "Standard results used",
    placeholder: "Which theorems / formulas this part needs…",
  },
  {
    id: "mistakes",
    db: "topper_points",
    label: "Mistakes to avoid",
    placeholder: "Sign errors, boundary cases, common traps…",
  },
];

/** Text fields per part — solution itself is a scan (photo), not typed text. */
export const MATH_PART_TEXT_FIELDS = MATH_QUESTION_NOTE_FIELDS;

export const MATH_PART_NOTE_FIELDS = MATH_PART_TEXT_FIELDS;

/** Sub-parts (a)–(e) on each UPSC Mathematics main question. */
export const MATH_PARTS = ["a", "b", "c", "d", "e"];

function emptyMathPart() {
  return Object.fromEntries(MATH_PART_TEXT_FIELDS.map((f) => [f.id, ""]));
}

export function emptyMathParts() {
  return Object.fromEntries(MATH_PARTS.map((p) => [p, emptyMathPart()]));
}

function mergeMathParts(base, patch) {
  const out = { ...base };
  for (const part of MATH_PARTS) {
    out[part] = { ...base[part] };
    const partPatch = patch?.[part];
    if (!partPatch) continue;
    for (const f of MATH_PART_TEXT_FIELDS) {
      if (partPatch[f.id] === undefined) continue;
      out[part][f.id] = coalesceNoteText(base[part]?.[f.id], partPatch[f.id]);
    }
  }
  return out;
}

function mathPartHasContent(partNotes) {
  return MATH_PART_TEXT_FIELDS.some((f) => String(partNotes?.[f.id] || "").trim());
}

function mathPartsHasContent(parts) {
  return MATH_PARTS.some((p) => mathPartHasContent(parts[p]));
}

/** Merge in-memory and localStorage math notes (never prefer empty cache over local). */
function mergeMathNotesFromSources(questionId) {
  const fromCache = questionCache.get(questionId);
  const local = loadLocal(LOCAL_QUESTION_KEY)[questionId];
  const localParsed = local ? parseLocalMathNotes(local) : null;
  let parts = emptyMathParts();
  if (fromCache?.parts) parts = mergeMathParts(parts, fromCache.parts);
  if (localParsed?.parts) parts = mergeMathParts(parts, localParsed.parts);
  // Lock state: cache (from cloud pull) wins; avoid stale local locks after unlock elsewhere.
  const __locks = fromCache?.__locks
    ? { ...fromCache.__locks }
    : { ...(localParsed?.__locks || {}) };
  return { parts, __locks };
}

export function getThemeNoteFields(paper) {
  return paper === 5 || paper === 6 ? MATH_MODULE_NOTE_FIELDS : THEME_NOTE_FIELDS;
}

export function getQuestionNoteFields(paper) {
  return paper === 5 || paper === 6 ? MATH_QUESTION_NOTE_FIELDS : QUESTION_NOTE_FIELDS;
}

export function isMathPaper(paper) {
  return paper === 5 || paper === 6;
}

const LOCAL_THEME_KEY = "upsc-pyq-theme-notes-v1";
const LOCAL_QUESTION_KEY = "upsc-pyq-notes-v1";
const LOCAL_META_KEY = "upsc-pyq-question-meta-v1";

/** @typedef {{ snapshot: string, lockedAt?: string|null }} FieldLockEntry */

function parseLockedFields(raw) {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object") return {};
  /** @type {Record<string, FieldLockEntry>} */
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === "object" && "snapshot" in value) {
      out[key] = {
        snapshot: String(value.snapshot ?? ""),
        lockedAt: value.lockedAt || null,
      };
    }
  }
  return out;
}

function serializeLockedFields(locks) {
  if (!locks || typeof locks !== "object") return {};
  /** @type {Record<string, FieldLockEntry>} */
  const out = {};
  for (const [key, entry] of Object.entries(locks)) {
    if (entry?.snapshot !== undefined) {
      out[key] = {
        snapshot: String(entry.snapshot),
        lockedAt: entry.lockedAt || new Date().toISOString(),
      };
    }
  }
  return out;
}

function getThemeLocksMap(themeId) {
  return themeCache.get(themeId)?.__locks || {};
}

function getQuestionLocksMap(questionId) {
  return questionCache.get(questionId)?.__locks || {};
}

export function isNoteFieldLocked(lockKey) {
  const parsed = parseLockKey(lockKey);
  if (!parsed) return false;
  if (parsed.kind === "theme") {
    return Boolean(getThemeLocksMap(parsed.themeId)[parsed.storageKey]);
  }
  return Boolean(getQuestionLocksMap(parsed.questionId)[parsed.storageKey]);
}

export function getLockedSnapshot(lockKey) {
  const parsed = parseLockKey(lockKey);
  if (!parsed) return "";
  const locks =
    parsed.kind === "theme"
      ? getThemeLocksMap(parsed.themeId)
      : getQuestionLocksMap(parsed.questionId);
  return locks[parsed.storageKey]?.snapshot ?? "";
}

function resolveTextForLock(cached, fieldId, textareaValue) {
  const fromTa = String(textareaValue ?? "");
  if (fromTa.trim()) return fromTa;
  const fromCache = String(cached?.[fieldId] ?? "");
  if (fromCache.trim()) return fromCache;
  return fromTa;
}

function resolveMathTextForLock(parts, partId, fieldId, textareaValue) {
  const fromTa = String(textareaValue ?? "");
  if (fromTa.trim()) return fromTa;
  const fromCache = String(parts?.[partId]?.[fieldId] ?? "");
  if (fromCache.trim()) return fromCache;
  return fromTa;
}

export async function lockNoteField(lockKey, currentValue) {
  const parsed = parseLockKey(lockKey);
  if (!parsed) return;

  if (parsed.kind === "theme") {
    const cached = themeCache.get(parsed.themeId) || {
      ...emptyThemeNotes(parsed.paper),
      __locks: {},
    };
    const snapshot = resolveTextForLock(cached, parsed.fieldId, currentValue);
    const entry = {
      snapshot,
      lockedAt: new Date().toISOString(),
    };
    cached.__locks = { ...(cached.__locks || {}), [parsed.storageKey]: entry };
    cached[parsed.fieldId] = snapshot;
    themeCache.set(parsed.themeId, cached);
    const local = loadLocal(LOCAL_THEME_KEY);
    const key = `p${parsed.paper}-${parsed.themeId}`;
    local[key] = stripThemeCacheForLocal(cached);
    saveLocal(LOCAL_THEME_KEY, local);
    if (isCloudSyncEnabled()) {
      pendingTheme.set(parsed.themeId, { paper: parsed.paper, notes: cached });
      clearTimeout(themeTimer);
      themeTimer = null;
      await flushThemeNotes({ syncLocks: true });
      await pushThemeLockStateToCloud(parsed.themeId, parsed.paper, cached.__locks || {});
    }
    return;
  }

  const paper = paperFromQuestionId(parsed.questionId);
  const prior = questionCache.get(parsed.questionId) || {};
  let snapshot;
  if (isMathPaper(paper) && parsed.partId) {
    const parts = mergeMathParts(emptyMathParts(), prior.parts);
    snapshot = resolveMathTextForLock(parts, parsed.partId, parsed.fieldId, currentValue);
  } else {
    snapshot = resolveTextForLock(
      { ...emptyQuestionNotes(paper), ...stripQuestionCacheForNotes(prior) },
      parsed.fieldId,
      currentValue
    );
  }
  const entry = {
    snapshot,
    lockedAt: new Date().toISOString(),
  };
  const nextLocks = { ...(prior.__locks || {}), [parsed.storageKey]: entry };
  let payload;
  if (isMathPaper(paper)) {
    const parts = mergeMathParts(emptyMathParts(), prior.parts);
    if (parsed.partId) {
      parts[parsed.partId][parsed.fieldId] = snapshot;
    }
    payload = { parts, __locks: nextLocks };
  } else {
    payload = {
      ...emptyQuestionNotes(paper),
      ...stripQuestionCacheForNotes(prior),
      [parsed.fieldId]: snapshot,
      __locks: nextLocks,
    };
  }
  persistQuestionNotes(parsed.questionId, payload, { syncCloud: false });
  if (isCloudSyncEnabled()) {
    clearTimeout(questionTimer);
    questionTimer = null;
    pendingQuestion.set(parsed.questionId, payload);
    await flushQuestionNotes({ syncLocks: true });
    await pushQuestionLockStateToCloud(parsed.questionId, nextLocks);
  }
}

async function pushThemeLockStateToCloud(themeId, paper, locks) {
  if (!isCloudSyncEnabled()) return;
  const payload = { locked_fields: serializeLockedFields(locks) };
  const { data, error } = await supabase
    .from("theme_notes")
    .update(payload)
    .eq("user_id", userId)
    .eq("theme_id", themeId)
    .eq("paper", paper)
    .select("theme_id");

  if (error) throw error;
  if (!data?.length) {
    const row = themeNotesToRow(
      themeId,
      paper,
      { ...emptyThemeNotes(paper), __locks: locks },
      userId
    );
    const { error: upsertError } = await supabase
      .from("theme_notes")
      .upsert(row, { onConflict: "user_id,theme_id" });
    if (upsertError) throw upsertError;
  }
}

async function pushQuestionLockStateToCloud(questionId, locks) {
  if (!isCloudSyncEnabled()) return;
  const paper = paperFromQuestionId(questionId);
  const payload = { locked_fields: serializeLockedFields(locks) };
  const { data, error } = await supabase
    .from("question_notes")
    .update(payload)
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .select("question_id");

  if (error) throw error;
  if (!data?.length) {
    const cached = questionCache.get(questionId) || { __locks: locks };
    const row = questionNotesToRow(questionId, { ...cached, __locks: locks }, userId);
    const { error: upsertError } = await supabase
      .from("question_notes")
      .upsert(row, { onConflict: "user_id,question_id" });
    if (upsertError) throw upsertError;
  }
}

export async function unlockNoteField(lockKey) {
  const parsed = parseLockKey(lockKey);
  if (!parsed) return;

  if (parsed.kind === "theme") {
    const cached = themeCache.get(parsed.themeId);
    if (!cached?.__locks?.[parsed.storageKey]) return;
    const nextLocks = { ...cached.__locks };
    delete nextLocks[parsed.storageKey];
    cached.__locks = nextLocks;
    themeCache.set(parsed.themeId, cached);
    const local = loadLocal(LOCAL_THEME_KEY);
    const key = `p${parsed.paper}-${parsed.themeId}`;
    local[key] = stripThemeCacheForLocal(cached);
    saveLocal(LOCAL_THEME_KEY, local);
    if (isCloudSyncEnabled()) {
      await pushThemeLockStateToCloud(parsed.themeId, parsed.paper, nextLocks);
    }
    return;
  }

  const cached = questionCache.get(parsed.questionId);
  if (!cached?.__locks?.[parsed.storageKey]) return;
  const nextLocks = { ...cached.__locks };
  delete nextLocks[parsed.storageKey];
  cached.__locks = nextLocks;
  questionCache.set(parsed.questionId, cached);
  writeLocalQuestionNotes(parsed.questionId, cached, paperFromQuestionId(parsed.questionId));
  if (isCloudSyncEnabled()) {
    await pushQuestionLockStateToCloud(parsed.questionId, nextLocks);
  }
}

function stripThemeCacheForLocal(cached) {
  const { __locks, ...notes } = cached;
  return { ...notes, __locks: __locks || {} };
}

function stripQuestionCacheForNotes(cached) {
  const { __locks, __meta, parts, ...flat } = cached;
  if (parts) return { parts, __locks: __locks || {} };
  return { ...flat, __locks: __locks || {} };
}

function hasLockedFields(locks) {
  return Boolean(locks && Object.keys(locks).length > 0);
}

/** First non-empty trimmed string among candidates (empty string does not block later values). */
function coalesceNoteText(...candidates) {
  for (const value of candidates) {
    const s = String(value ?? "");
    if (s.trim()) return s;
  }
  return String(candidates[candidates.length - 1] ?? "");
}

/** Prefer live text; if empty, use frozen snapshot from lock metadata. */
function pickNoteText(current, lockEntry) {
  if (String(current ?? "").trim()) return String(current ?? "");
  if (lockEntry?.snapshot !== undefined) return String(lockEntry.snapshot);
  return String(current ?? "");
}

function hydrateThemeNotesDisplay(notes, locks, paper) {
  if (!locks || !paper) return notes;
  for (const f of getThemeNoteFields(paper)) {
    notes[f.id] = pickNoteText(notes[f.id], locks[f.id]);
  }
  return notes;
}

function hydrateQuestionNotesDisplay(notes, locks, paper) {
  if (!locks || !paper) return notes;
  for (const f of allQuestionNoteFields(paper)) {
    notes[f.id] = pickNoteText(notes[f.id], locks[f.id]);
  }
  return notes;
}

function hydrateMathPartsDisplay(parts, locks) {
  const out = mergeMathParts(emptyMathParts(), parts);
  if (!locks) return out;
  for (const part of MATH_PARTS) {
    for (const f of MATH_PART_TEXT_FIELDS) {
      const key = `${part}:${f.id}`;
      out[part][f.id] = pickNoteText(out[part][f.id], locks[key]);
    }
  }
  return out;
}

export const REVISION_DUE_DAYS = 30;

export const QUESTION_STATUSES = [
  { id: "not-started", label: "Not started" },
  { id: "attempted", label: "Attempted" },
  { id: "revised", label: "Revised" },
  { id: "weak", label: "Weak" },
];

const DEFAULT_META = {
  status: "not-started",
  bookmarked: false,
  statusUpdatedAt: null,
  lastRevisedAt: null,
};

/** Shown below diagrams on each question card (not in the main notes accordion). */
export const BEST_ANSWER_FIELD = {
  id: "bestAnswerOnline",
  db: "best_answer_online",
  label: "Best answer online",
  placeholder:
    "Paste a strong model answer from the web (Vision, Forum, Insights, ClearIAS, etc.)…",
};

function allQuestionNoteFields(paper = null) {
  const base = paper && isMathPaper(paper) ? MATH_QUESTION_NOTE_FIELDS : QUESTION_NOTE_FIELDS;
  return paper && isMathPaper(paper) ? base : [...base, BEST_ANSWER_FIELD];
}

function emptyThemeNotes(paper = null) {
  const fields = paper ? getThemeNoteFields(paper) : THEME_NOTE_FIELDS;
  return Object.fromEntries(fields.map((f) => [f.id, ""]));
}

function emptyQuestionNotes(paper = null) {
  if (paper && isMathPaper(paper)) {
    return { parts: emptyMathParts() };
  }
  return Object.fromEntries(allQuestionNoteFields(paper).map((f) => [f.id, ""]));
}

function legacyFlatToPartA(row) {
  if (!row) return emptyMathPart();
  return {
    approach: row.introduction || "",
    standardResultsUsed: row.static_notes || "",
    mistakes: row.topper_points || "",
  };
}

function parseMathJsonBlob(raw) {
  if (raw == null || raw === "") return null;
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (parsed.parts && typeof parsed.parts === "object" && !Array.isArray(parsed.parts)) {
    return parsed.parts;
  }
  return parsed;
}

function parseMathPartsFromRow(row) {
  let parts = emptyMathParts();

  for (const field of [row?.quotes, row?.static_notes]) {
    const blob = parseMathJsonBlob(field);
    if (blob) parts = mergeMathParts(parts, blob);
    if (mathPartsHasContent(parts)) break;
  }

  if (!mathPartHasContent(parts.a)) {
    parts.a = mergeMathParts(parts, { a: legacyFlatToPartA(row) }).a;
  }

  return parts;
}

function parseLocalMathNotes(stored) {
  const locks = stored?.__locks || {};
  if (stored?.parts) {
    return { parts: mergeMathParts(emptyMathParts(), stored.parts), __locks: locks };
  }

  const parts = emptyMathParts();
  const legacy = emptyMathPart();
  for (const f of MATH_PART_TEXT_FIELDS) {
    if (stored?.[f.id]?.trim()) legacy[f.id] = stored[f.id];
  }
  if (mathPartHasContent(legacy)) {
    parts.a = legacy;
  }
  return { parts, __locks: locks };
}

function loadLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function saveLocal(key, store) {
  localStorage.setItem(key, JSON.stringify(store));
}

function parseMetaFromRow(row) {
  if (!row) return { ...DEFAULT_META };
  return {
    status: row.study_status || "not-started",
    bookmarked: Boolean(row.bookmarked),
    statusUpdatedAt: row.status_updated_at || null,
    lastRevisedAt: row.last_revised_at || null,
  };
}

function loadLocalMetaStore() {
  return loadLocal(LOCAL_META_KEY);
}

function saveLocalMetaStore(store) {
  saveLocal(LOCAL_META_KEY, store);
}

export function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

export function isDueForRevision(meta) {
  if (!meta) return false;
  if (meta.status === "weak" && daysSince(meta.lastRevisedAt) >= REVISION_DUE_DAYS) return true;
  if (meta.bookmarked) {
    if (meta.status === "attempted") return true;
    return daysSince(meta.lastRevisedAt) >= REVISION_DUE_DAYS;
  }
  return false;
}

export function isWeakAndStale(meta) {
  return meta?.status === "weak" && daysSince(meta?.lastRevisedAt) >= REVISION_DUE_DAYS;
}

export function getQuestionMeta(questionId) {
  const cached = questionCache.get(questionId);
  if (cached?.__meta) return { ...DEFAULT_META, ...cached.__meta };

  const localMeta = loadLocalMetaStore()[questionId];
  if (localMeta) return { ...DEFAULT_META, ...localMeta };

  return { ...DEFAULT_META };
}

function attachMetaToCache(questionId, meta) {
  const existing = questionCache.get(questionId);
  if (existing) {
    questionCache.set(questionId, { ...existing, __meta: { ...DEFAULT_META, ...meta } });
    return;
  }
  const paper = paperFromQuestionId(questionId);
  const base = isMathPaper(paper) ? { parts: emptyMathParts() } : emptyQuestionNotes(paper);
  questionCache.set(questionId, { ...base, __meta: { ...DEFAULT_META, ...meta } });
}

export function saveQuestionMeta(questionId, patch) {
  const current = getQuestionMeta(questionId);
  const next = { ...current, ...patch };

  if (patch.status !== undefined) {
    next.statusUpdatedAt = new Date().toISOString();
    if (patch.status === "revised") {
      next.lastRevisedAt = new Date().toISOString();
    }
  }

  attachMetaToCache(questionId, next);

  import("./activity-tracker.js")
    .then(({ recordStatusActivity, recordBookmarkActivity }) => {
      if (patch.status !== undefined) recordStatusActivity(questionId);
      if (patch.bookmarked !== undefined) recordBookmarkActivity(questionId);
    })
    .catch(() => {});

  if (isCloudSyncEnabled()) {
    const cached = questionCache.get(questionId) || {};
    pendingQuestion.set(questionId, cached);
    scheduleQuestionFlush();
    return next;
  }

  const localMeta = loadLocalMetaStore();
  localMeta[questionId] = next;
  saveLocalMetaStore(localMeta);
  return next;
}

export function setQuestionStatus(questionId, status) {
  return saveQuestionMeta(questionId, { status });
}

export function toggleQuestionBookmark(questionId) {
  const meta = getQuestionMeta(questionId);
  return saveQuestionMeta(questionId, { bookmarked: !meta.bookmarked });
}

export function getReviseTodayItems(questions, limit = 5) {
  return questions
    .filter((q) => isDueForRevision(getQuestionMeta(q.id)))
    .sort((a, b) => {
      const ma = getQuestionMeta(a.id);
      const mb = getQuestionMeta(b.id);
      const da = new Date(ma.lastRevisedAt || ma.statusUpdatedAt || 0).getTime();
      const db = new Date(mb.lastRevisedAt || mb.statusUpdatedAt || 0).getTime();
      return da - db;
    })
    .slice(0, limit);
}

/** Progress counts for a theme/module from loaded question meta. */
export function getThemeProgress(questions, themeId) {
  const qs = questions.filter((q) => q.themeId === themeId || q.moduleId === themeId);
  let attempted = 0;
  let weak = 0;
  for (const q of qs) {
    const meta = getQuestionMeta(q.id);
    if (meta.status !== "not-started") attempted += 1;
    if (meta.status === "weak") weak += 1;
  }
  return { total: qs.length, attempted, weak };
}

function paperFromQuestionId(questionId) {
  if (questionId.startsWith("math1-")) return 5;
  if (questionId.startsWith("math2-")) return 6;
  return null;
}

function rowToThemeNotes(row, paper) {
  const out = emptyThemeNotes(paper);
  if (!row) return { ...out, __locks: {} };
  const locks = parseLockedFields(row.locked_fields);
  for (const f of getThemeNoteFields(paper)) {
    out[f.id] = pickNoteText(row[f.db] || "", locks[f.id]);
  }
  return { ...out, __locks: locks };
}

function rowToQuestionNotes(row, paper = null) {
  const resolvedPaper = paper ?? (row?.question_id ? paperFromQuestionId(row.question_id) : null);
  let out;
  if (isMathPaper(resolvedPaper)) {
    out = { parts: parseMathPartsFromRow(row) };
  } else {
    out = emptyQuestionNotes(resolvedPaper);
    if (row) {
      for (const f of allQuestionNoteFields(resolvedPaper)) {
        out[f.id] = row[f.db] || "";
      }
    }
  }
  const locks = parseLockedFields(row?.locked_fields);
  out.__locks = locks;
  out.__meta = parseMetaFromRow(row);
  if (isMathPaper(resolvedPaper)) {
    out.parts = hydrateMathPartsDisplay(out.parts, locks);
  } else if (row) {
    hydrateQuestionNotesDisplay(out, locks, resolvedPaper);
  }
  return out;
}

function applyLocksToMathParts(parts, locks) {
  const out = mergeMathParts(emptyMathParts(), parts);
  if (!locks) return out;
  for (const part of MATH_PARTS) {
    for (const f of MATH_PART_TEXT_FIELDS) {
      const key = `${part}:${f.id}`;
      if (locks[key]?.snapshot !== undefined) {
        out[part][f.id] = String(locks[key].snapshot);
      }
    }
  }
  return out;
}

function localThemeNotes(themeId, paper) {
  const raw = loadLocal(LOCAL_THEME_KEY)[`p${paper}-${themeId}`];
  if (!raw || typeof raw !== "object") {
    return { notes: emptyThemeNotes(paper), locks: {} };
  }
  const locks = parseLockedFields(raw.__locks);
  const { __locks, ...fields } = raw;
  const notes = hydrateThemeNotesDisplay({ ...emptyThemeNotes(paper), ...fields }, locks, paper);
  return { notes, locks };
}

function mergeThemeNotesFromCloudPull(themeId, paper, cloudNotes) {
  const { notes: fromLocalNotes, locks: fromLocalLocks } = localThemeNotes(themeId, paper);
  const cached = themeCache.get(themeId) || {};
  const { __locks: _cachedLocks, ...cachedNotes } = cached;
  const { __locks: cloudLocks = {}, ...cloudFields } = cloudNotes;
  // Cloud `locked_fields` is authoritative (unlock removes keys; local must not keep stale locks).
  const mergedLocks = { ...cloudLocks };
  const merged = { ...cloudFields };
  const fields = getThemeNoteFields(paper);
  for (const f of fields) {
    if (mergedLocks[f.id]) {
      merged[f.id] = pickNoteText(cloudFields[f.id], mergedLocks[f.id]);
    } else {
      merged[f.id] = coalesceNoteText(
        fromLocalNotes[f.id],
        cachedNotes[f.id],
        cloudFields[f.id]
      );
    }
  }
  merged.__locks = mergedLocks;
  hydrateThemeNotesDisplay(merged, merged.__locks, paper);
  return merged;
}

function mergeQuestionNotesFromCloudPull(questionId, cloudNotes) {
  const paper = paperFromQuestionId(questionId);
  const cached = questionCache.get(questionId);
  const local = cached
    ? isMathPaper(paper)
      ? { parts: cached.parts || emptyMathParts() }
      : { ...emptyQuestionNotes(paper), ...stripQuestionCacheForNotes(cached) }
    : getQuestionNotes(questionId);
  const cloudLocks = cloudNotes.__locks || {};

  if (isMathPaper(paper)) {
    const { __locks: _l, parts: cloudParts, ...rest } = cloudNotes;
    const parts = mergeMathParts(emptyMathParts(), cloudParts);
    for (const part of MATH_PARTS) {
      for (const f of MATH_PART_TEXT_FIELDS) {
        const storageKey = `${part}:${f.id}`;
        if (cloudLocks[storageKey]) {
          parts[part][f.id] = pickNoteText(parts[part][f.id], cloudLocks[storageKey]);
        } else {
          parts[part][f.id] = coalesceNoteText(
            local.parts?.[part]?.[f.id],
            parts[part][f.id]
          );
        }
      }
    }
    const hydratedParts = hydrateMathPartsDisplay(parts, cloudLocks);
    return { ...rest, parts: hydratedParts, __locks: { ...cloudLocks } };
  }

  const { __locks: _l, __meta, ...cloudFields } = cloudNotes;
  const merged = { ...cloudFields };
  for (const f of allQuestionNoteFields(paper)) {
    if (cloudLocks[f.id]) {
      merged[f.id] = pickNoteText(cloudFields[f.id], cloudLocks[f.id]);
    } else {
      merged[f.id] = coalesceNoteText(local[f.id], cloudFields[f.id]);
    }
  }
  if (__meta) merged.__meta = __meta;
  merged.__locks = { ...cloudLocks };
  hydrateQuestionNotesDisplay(merged, merged.__locks, paper);
  return merged;
}

function themeNotesToRow(themeId, paper, notes, userId, cloudFields = null) {
  const row = { user_id: userId, theme_id: themeId, paper };
  const locks = notes.__locks || themeCache.get(themeId)?.__locks || {};
  const cloud = cloudFields || {};
  for (const f of getThemeNoteFields(paper)) {
    const lock = locks[f.id];
    row[f.db] =
      lock?.snapshot !== undefined
        ? String(lock.snapshot)
        : coalesceNoteText(notes[f.id], cloud[f.id]);
  }
  row.locked_fields = serializeLockedFields(locks);
  return row;
}

function questionNotesToRow(questionId, notes, userId, cloudFields = null) {
  const paper = paperFromQuestionId(questionId);
  const row = { user_id: userId, question_id: questionId };
  const meta = notes.__meta || getQuestionMeta(questionId);

  row.study_status = meta.status || "not-started";
  row.bookmarked = Boolean(meta.bookmarked);
  row.status_updated_at = meta.statusUpdatedAt || null;
  row.last_revised_at = meta.lastRevisedAt || null;

  if (isMathPaper(paper)) {
    const qLocks = notes.__locks || getQuestionLocksMap(questionId);
    const parts = applyLocksToMathParts(notes.parts || emptyMathParts(), qLocks);
    const json = JSON.stringify(parts);
    const partA = parts.a || emptyMathPart();
    row.introduction = partA.approach || "";
    row.static_notes = partA.standardResultsUsed || "";
    row.topper_points = partA.mistakes || "";
    row.quotes = json;
    row.current_affairs = "";
    row.value_material = "";
    row.best_answer_online = "";
    row.locked_fields = serializeLockedFields(notes.__locks || getQuestionLocksMap(questionId));
    return row;
  }

  const qLocks = notes.__locks || getQuestionLocksMap(questionId);
  const cloud = cloudFields || {};
  for (const f of allQuestionNoteFields(paper)) {
    const lock = qLocks[f.id];
    row[f.db] =
      lock?.snapshot !== undefined
        ? String(lock.snapshot)
        : coalesceNoteText(notes[f.id], cloud[f.id]);
  }
  row.locked_fields = serializeLockedFields(qLocks);
  return row;
}

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let supabase = null;
/** @type {string | null} */
let userId = null;
/** @type {string | null} */
let storeUserId = null;

/** @type {Map<string, Record<string, string>>} */
const themeCache = new Map();
/** @type {Map<string, Record<string, string>>} */
const questionCache = new Map();

const pendingTheme = new Map();
const pendingQuestion = new Map();
let themeTimer = null;
let questionTimer = null;
const CLOUD_BATCH_SIZE = 40;
/** @type {string | null} */
let lastSyncError = null;

export function getLastSyncError() {
  return lastSyncError;
}

export function clearLastSyncError() {
  lastSyncError = null;
}

export function setLastSyncError(message) {
  lastSyncError = message || null;
}

export function initNotesStore(client, uid) {
  supabase = client;
  if (storeUserId !== uid) {
    themeCache.clear();
    questionCache.clear();
    pendingTheme.clear();
    pendingQuestion.clear();
    storeUserId = uid;
  }
  userId = uid;
}

export function clearNotesStore() {
  supabase = null;
  userId = null;
  storeUserId = null;
  themeCache.clear();
  questionCache.clear();
  pendingTheme.clear();
  pendingQuestion.clear();
}

export function isCloudSyncEnabled() {
  return Boolean(supabase && userId);
}

export function getSyncStatus() {
  if (isCloudSyncEnabled()) return "cloud";
  return "local";
}

export async function loadThemeNotesForPaper(paper) {
  const localStore = loadLocal(LOCAL_THEME_KEY);
  for (const [key, notes] of Object.entries(localStore)) {
    if (!key.startsWith(`p${paper}-`)) continue;
    const themeId = key.slice(`p${paper}-`.length);
    const { notes, locks } = localThemeNotes(themeId, paper);
    themeCache.set(themeId, { ...notes, __locks: locks });
  }

  if (isCloudSyncEnabled()) {
    const { data, error } = await supabase
      .from("theme_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("paper", paper);

    if (error) throw error;

    for (const row of data || []) {
      const cloud = rowToThemeNotes(row, paper);
      const merged = mergeThemeNotesFromCloudPull(row.theme_id, paper, cloud);
      themeCache.set(row.theme_id, merged);
      localStore[`p${paper}-${row.theme_id}`] = stripThemeCacheForLocal(merged);
    }
    saveLocal(LOCAL_THEME_KEY, localStore);
    return;
  }
}

export function getThemeNotes(themeId, paper = null) {
  const cached = themeCache.get(themeId);
  if (cached) {
    const locks = cached.__locks || {};
    const { __locks, ...notes } = cached;
    const out = { ...emptyThemeNotes(paper), ...notes };
    return hydrateThemeNotesDisplay(out, locks, paper);
  }
  if (paper != null) {
    const { notes, locks } = localThemeNotes(themeId, paper);
    if (Object.values(notes).some((v) => String(v).trim()) || hasLockedFields(locks)) {
      return notes;
    }
  }
  return emptyThemeNotes(paper);
}

export function saveThemeNote(themeId, paper, fieldId, value) {
  const cached = themeCache.get(themeId) || { ...emptyThemeNotes(paper), __locks: {} };
  cached[fieldId] = value;
  themeCache.set(themeId, cached);

  import("./activity-tracker.js")
    .then(({ recordNoteActivity }) => recordNoteActivity("theme", `p${paper}-${themeId}`, fieldId, value))
    .catch(() => {});

  const local = loadLocal(LOCAL_THEME_KEY);
  const key = `p${paper}-${themeId}`;
  local[key] = stripThemeCacheForLocal(cached);
  saveLocal(LOCAL_THEME_KEY, local);

  const lockKey = themeFieldLockKey(paper, themeId, fieldId);
  if (isCloudSyncEnabled() && !isNoteFieldLocked(lockKey)) {
    pendingTheme.set(themeId, { paper, notes: cached });
    scheduleThemeFlush();
  }
}

function hydrateQuestionCacheFromLocal(questionIds) {
  const local = loadLocal(LOCAL_QUESTION_KEY);
  for (const id of questionIds) {
    if (questionCache.has(id) || !local[id]) continue;
    const paper = paperFromQuestionId(id);
    const parsed = isMathPaper(paper)
      ? parseLocalMathNotes(local[id])
      : { ...emptyQuestionNotes(paper), ...local[id] };
    const localMeta = loadLocalMetaStore()[id];
    if (localMeta) parsed.__meta = { ...DEFAULT_META, ...localMeta };
    questionCache.set(id, parsed);
  }
}

export async function loadQuestionNotesForIds(questionIds) {
  if (!questionIds.length) return;

  if (isCloudSyncEnabled()) {
    const missing = questionIds.filter((id) => !questionCache.has(id));
    if (missing.length) {
      const { data, error } = await supabase
        .from("question_notes")
        .select("*")
        .eq("user_id", userId)
        .in("question_id", missing);

      if (error) throw error;

      for (const row of data || []) {
        const cloud = rowToQuestionNotes(row);
        questionCache.set(
          row.question_id,
          mergeQuestionNotesFromCloudPull(row.question_id, cloud)
        );
      }
      hydrateQuestionCacheFromLocal(missing);
    }
    return;
  }

  const local = loadLocal(LOCAL_QUESTION_KEY);
  for (const id of questionIds) {
    if (!questionCache.has(id) && local[id]) {
      const paper = paperFromQuestionId(id);
      const parsed = isMathPaper(paper)
        ? parseLocalMathNotes(local[id])
        : { ...emptyQuestionNotes(paper), ...local[id] };
      const localMeta = loadLocalMetaStore()[id];
      if (localMeta) parsed.__meta = { ...DEFAULT_META, ...localMeta };
      questionCache.set(id, parsed);
    }
  }
}

export function getQuestionNotes(questionId, fileNotes = {}) {
  const paper = paperFromQuestionId(questionId);

  if (isMathPaper(paper)) {
    const merged = mergeMathNotesFromSources(questionId);
    return {
      parts: hydrateMathPartsDisplay(merged.parts, merged.__locks),
    };
  }

  const fromCache = questionCache.get(questionId);
  if (fromCache) {
    const locks = fromCache.__locks || {};
    const { __locks, __meta, ...notes } = fromCache;
    const out = { ...emptyQuestionNotes(paper), ...notes };
    return hydrateQuestionNotesDisplay(out, locks, paper);
  }

  const local = loadLocal(LOCAL_QUESTION_KEY)[questionId] || {};
  const merged = { ...emptyQuestionNotes(paper), ...fileNotes };
  for (const f of allQuestionNoteFields(paper)) {
    if (local[f.id]?.trim()) merged[f.id] = local[f.id];
  }
  return merged;
}

/** Same cloud path for GS and math: localStorage → cache → pendingQuestion → flush. */
function persistQuestionNotes(questionId, payload, { syncCloud = true } = {}) {
  const paper = paperFromQuestionId(questionId);
  const prior = questionCache.get(questionId);
  const withMeta = {
    ...payload,
    __locks: payload.__locks ?? prior?.__locks ?? {},
    __meta: payload.__meta || prior?.__meta || getQuestionMeta(questionId),
  };
  questionCache.set(questionId, withMeta);
  writeLocalQuestionNotes(questionId, withMeta, paper);

  if (isCloudSyncEnabled() && syncCloud) {
    pendingQuestion.set(questionId, withMeta);
    scheduleQuestionFlush();
  }
}

export function saveQuestionNote(questionId, fieldId, value) {
  const paper = paperFromQuestionId(questionId);
  if (isMathPaper(paper)) {
    saveMathPartNote(questionId, "a", fieldId, value);
    return;
  }

  const cached = questionCache.get(questionId) || { ...emptyQuestionNotes(paper), __locks: {} };
  cached[fieldId] = value;

  import("./activity-tracker.js")
    .then(({ recordNoteActivity }) => recordNoteActivity("question", questionId, fieldId, value))
    .catch(() => {});

  const lockKey = questionFieldLockKey(questionId, fieldId);
  persistQuestionNotes(questionId, cached, {
    syncCloud: !isNoteFieldLocked(lockKey),
  });
}

export function saveMathPartNote(questionId, partId, fieldId, value) {
  if (!MATH_PARTS.includes(partId)) return;
  if (!MATH_PART_TEXT_FIELDS.some((f) => f.id === fieldId)) return;

  const merged = mergeMathNotesFromSources(questionId);
  const parts = mergeMathParts(emptyMathParts(), merged.parts);
  parts[partId][fieldId] = value;
  import("./activity-tracker.js")
    .then(({ recordNoteActivity }) =>
      recordNoteActivity("question", questionId, `${partId}:${fieldId}`, value)
    )
    .catch(() => {});
  const lockKey = questionFieldLockKey(questionId, fieldId, partId);
  persistQuestionNotes(
    questionId,
    { parts, __locks: merged.__locks || {} },
    { syncCloud: !isNoteFieldLocked(lockKey) }
  );
}

function writeLocalQuestionNotes(questionId, notes, paper = null) {
  const resolvedPaper = paper ?? paperFromQuestionId(questionId);
  const local = loadLocal(LOCAL_QUESTION_KEY);
  if (isMathPaper(resolvedPaper)) {
    local[questionId] = {
      parts: notes.parts || emptyMathParts(),
      __locks: notes.__locks || {},
    };
  } else {
    const stored = { __locks: notes.__locks || {} };
    for (const f of allQuestionNoteFields(resolvedPaper)) {
      if (notes[f.id] !== undefined) stored[f.id] = notes[f.id];
    }
    local[questionId] = stored;
  }
  saveLocal(LOCAL_QUESTION_KEY, local);
}

/** Fetch one theme's notes (including locks) from Supabase. */
export async function refreshThemeNoteFromCloud(themeId, paper) {
  if (!isCloudSyncEnabled()) return false;

  const { data, error } = await supabase
    .from("theme_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("theme_id", themeId)
    .eq("paper", paper)
    .maybeSingle();

  if (error) {
    lastSyncError = error.message;
    throw error;
  }
  if (!data) return false;

  const cloud = rowToThemeNotes(data, paper);
  const merged = mergeThemeNotesFromCloudPull(themeId, paper, cloud);
  themeCache.set(themeId, merged);
  const local = loadLocal(LOCAL_THEME_KEY);
  local[`p${paper}-${themeId}`] = stripThemeCacheForLocal({
    ...merged,
    __locks: merged.__locks || {},
  });
  saveLocal(LOCAL_THEME_KEY, local);
  return true;
}

/** Fetch one PYQ's notes from Supabase into cache + localStorage. */
export async function pullQuestionNoteFromCloud(questionId) {
  if (!isCloudSyncEnabled()) return false;

  const { data, error } = await supabase
    .from("question_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (error) {
    lastSyncError = error.message;
    throw error;
  }
  if (!data) return false;

  cacheQuestionRowFromCloud(data);
  return mathPartsHasContent(mergeMathNotesFromSources(questionId).parts);
}

function scheduleThemeFlush() {
  clearTimeout(themeTimer);
  themeTimer = setTimeout(() => flushThemeNotes(), 700);
}

function scheduleQuestionFlush() {
  clearTimeout(questionTimer);
  questionTimer = setTimeout(() => flushQuestionNotes(), 400);
}

export async function flushPendingNotesNow() {
  clearTimeout(questionTimer);
  clearTimeout(themeTimer);
  questionTimer = null;
  themeTimer = null;
  await Promise.all([flushThemeNotes(), flushQuestionNotes()]);
}

/** @returns {Map<string, { fields: Record<string, string>, locks: Record<string, FieldLockEntry> }>} */
async function fetchThemeCloudSnapshots(themeIds, paper) {
  if (!themeIds.length) return new Map();
  const { data, error } = await supabase
    .from("theme_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("paper", paper)
    .in("theme_id", themeIds);
  if (error) throw error;
  const byId = new Map();
  for (const row of data || []) {
    const parsed = rowToThemeNotes(row, paper);
    const { __locks, ...fields } = parsed;
    byId.set(row.theme_id, { fields, locks: __locks || {} });
  }
  return byId;
}

/** @returns {Map<string, { gs?: Record<string, string>, mathParts?: ReturnType<typeof emptyMathParts>, locks: Record<string, FieldLockEntry> }>} */
async function fetchQuestionCloudSnapshots(questionIds) {
  if (!questionIds.length) return new Map();
  const { data, error } = await supabase
    .from("question_notes")
    .select("*")
    .eq("user_id", userId)
    .in("question_id", questionIds);
  if (error) throw error;
  const byId = new Map();
  for (const row of data || []) {
    const paper = paperFromQuestionId(row.question_id);
    if (isMathPaper(paper)) {
      const parsed = rowToQuestionNotes(row, paper);
      byId.set(row.question_id, {
        mathParts: parsed.parts,
        locks: parsed.__locks || {},
      });
    } else {
      const parsed = rowToQuestionNotes(row, paper);
      const { __locks, __meta, parts, ...fields } = parsed;
      byId.set(row.question_id, { gs: fields, locks: __locks || {} });
    }
  }
  return byId;
}

async function flushThemeNotes({ syncLocks = false } = {}) {
  if (!isCloudSyncEnabled() || pendingTheme.size === 0) return;

  const batch = [...pendingTheme.entries()];
  pendingTheme.clear();

  const byPaper = new Map();
  for (const [themeId, entry] of batch) {
    if (!byPaper.has(entry.paper)) byPaper.set(entry.paper, []);
    byPaper.get(entry.paper).push([themeId, entry.notes]);
  }

  try {
    for (const [paper, items] of byPaper) {
      const themeIds = items.map(([id]) => id);
      const cloudByTheme = await fetchThemeCloudSnapshots(themeIds, paper);
      for (const [themeId, notes] of items) {
        const cloud = cloudByTheme.get(themeId) || { fields: {}, locks: {} };
        const locksForRow = syncLocks ? notes.__locks || {} : cloud.locks;
        if (!hasContent(notes) && !hasLockedFields(locksForRow)) continue;
        const payload = { ...notes, __locks: locksForRow };
        const row = themeNotesToRow(themeId, paper, payload, userId, cloud.fields);
        const { error } = await supabase
          .from("theme_notes")
          .upsert(row, { onConflict: "user_id,theme_id" });
        if (error) {
          lastSyncError = error.message;
          console.error("Theme note save failed:", error.message);
        } else if (!syncLocks && notes.__locks && Object.keys(notes.__locks).length) {
          // Align in-memory/local locks with cloud after text-only save.
          const cached = themeCache.get(themeId);
          if (cached) {
            cached.__locks = { ...cloud.locks };
            themeCache.set(themeId, cached);
            const local = loadLocal(LOCAL_THEME_KEY);
            const key = `p${paper}-${themeId}`;
            if (local[key]) {
              local[key] = stripThemeCacheForLocal(cached);
              saveLocal(LOCAL_THEME_KEY, local);
            }
          }
        }
      }
    }
  } catch (err) {
    lastSyncError = err?.message || String(err);
    console.error("Theme note flush failed:", err);
  }
}

async function flushQuestionNotes({ syncLocks = false } = {}) {
  if (!isCloudSyncEnabled() || pendingQuestion.size === 0) return;

  const batch = [...pendingQuestion.entries()];
  pendingQuestion.clear();

  const questionIds = batch.map(([id]) => id);
  let cloudByQuestion = new Map();
  try {
    cloudByQuestion = await fetchQuestionCloudSnapshots(questionIds);
  } catch (err) {
    lastSyncError = err?.message || String(err);
    console.error("Question note cloud prefetch failed:", err);
  }

  for (const [questionId, notes] of batch) {
    const paper = paperFromQuestionId(questionId);
    const cloud = cloudByQuestion.get(questionId) || { locks: {} };
    const locksForRow = syncLocks ? notes.__locks || {} : cloud.locks || {};
    let payload;
    if (isMathPaper(paper)) {
      let parts;
      if (syncLocks && notes.parts) {
        parts = applyLocksToMathParts(notes.parts, locksForRow);
      } else {
        const merged = mergeMathNotesFromSources(questionId);
        const cloudParts = cloud.mathParts || emptyMathParts();
        parts = mergeMathParts(cloudParts, merged.parts);
      }
      if (!mathPartsHasContent(parts) && !hasLockedFields(locksForRow)) continue;
      payload = {
        parts,
        __locks: locksForRow,
        __meta: getQuestionMeta(questionId),
      };
      questionCache.set(questionId, payload);
      writeLocalQuestionNotes(questionId, payload, paper);
    } else {
      payload = {
        ...notes,
        __locks: locksForRow,
        __meta: notes.__meta || getQuestionMeta(questionId),
      };
      if (!hasContent(payload) && !hasLockedFields(locksForRow)) continue;
    }

    if (!syncLocks) {
      const cached = questionCache.get(questionId);
      if (cached) {
        cached.__locks = { ...locksForRow };
        questionCache.set(questionId, cached);
        writeLocalQuestionNotes(questionId, cached, paper);
      }
    }

    const cloudFields = cloud.gs;
    const row = questionNotesToRow(questionId, payload, userId, cloudFields);
    const { error } = await supabase
      .from("question_notes")
      .upsert(row, { onConflict: "user_id,question_id" });

    if (error) {
      lastSyncError = error.message;
      console.error("Question note save failed:", error.message);
    }
  }
}

function cacheQuestionRowFromCloud(row) {
  const parsed = mergeQuestionNotesFromCloudPull(
    row.question_id,
    rowToQuestionNotes(row)
  );
  questionCache.set(row.question_id, parsed);
  const paper = paperFromQuestionId(row.question_id);
  if (isMathPaper(paper)) {
    writeLocalQuestionNotes(
      row.question_id,
      { parts: parsed.parts, __locks: parsed.__locks },
      paper
    );
  } else {
    writeLocalQuestionNotes(row.question_id, parsed, paper);
  }
  const meta = parseMetaFromRow(row);
  const localMeta = loadLocalMetaStore();
  localMeta[row.question_id] = meta;
  saveLocal(LOCAL_META_KEY, localMeta);
}

/** Download all cloud notes into memory + localStorage (other device / browser). */
export async function pullAllNotesFromCloud() {
  if (!isCloudSyncEnabled()) return { themes: 0, questions: 0 };

  const [qRes, tRes] = await Promise.all([
    supabase.from("question_notes").select("*").eq("user_id", userId),
    supabase.from("theme_notes").select("*").eq("user_id", userId),
  ]);

  if (qRes.error) throw qRes.error;
  if (tRes.error) throw tRes.error;

  for (const row of qRes.data || []) {
    cacheQuestionRowFromCloud(row);
  }

  const localThemes = loadLocal(LOCAL_THEME_KEY);
  for (const [key] of Object.entries(localThemes)) {
    const m = key.match(/^p(\d)-(.+)$/);
    if (!m) continue;
    const paper = Number(m[1]);
    const themeId = m[2];
    const { notes } = localThemeNotes(themeId, paper);
    themeCache.set(themeId, { ...notes, __locks: {} });
  }
  for (const row of tRes.data || []) {
    const cloud = rowToThemeNotes(row, row.paper);
    const merged = mergeThemeNotesFromCloudPull(row.theme_id, row.paper, cloud);
    themeCache.set(row.theme_id, merged);
    localThemes[`p${row.paper}-${row.theme_id}`] = stripThemeCacheForLocal({
      ...merged,
      __locks: merged.__locks || {},
    });
  }
  saveLocal(LOCAL_THEME_KEY, localThemes);

  return { themes: (tRes.data || []).length, questions: (qRes.data || []).length };
}

async function upsertInBatches(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += CLOUD_BATCH_SIZE) {
    const chunk = rows.slice(i, i + CLOUD_BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw error;
  }
}

/** Push local notes in batches (fast; same as GS path). */
export async function pushLocalNotesToCloud() {
  if (!isCloudSyncEnabled()) return { themes: 0, questions: 0 };

  const themeRows = [];
  for (const [key, notes] of Object.entries(loadLocal(LOCAL_THEME_KEY))) {
    const m = key.match(/^p(\d)-(.+)$/);
    if (!m || (!hasContent(notes) && !hasLockedFields(notes.__locks))) continue;
    const paper = Number(m[1]);
    themeRows.push(
      themeNotesToRow(m[2], paper, { ...emptyThemeNotes(paper), ...notes }, userId)
    );
  }

  const questionRows = [];
  const localMeta = loadLocalMetaStore();
  for (const [questionId, notes] of Object.entries(loadLocal(LOCAL_QUESTION_KEY))) {
    const meta = localMeta[questionId];
    if (
      !hasContent(notes) &&
      !hasLockedFields(notes.__locks) &&
      (!meta || (meta.status === "not-started" && !meta.bookmarked))
    ) {
      continue;
    }
    const paper = paperFromQuestionId(questionId);
    const payload = isMathPaper(paper) ? parseLocalMathNotes(notes) : { ...emptyQuestionNotes(paper), ...notes };
    if (meta) payload.__meta = { ...DEFAULT_META, ...meta };
    questionRows.push(questionNotesToRow(questionId, payload, userId));
  }

  if (themeRows.length) await upsertInBatches("theme_notes", themeRows, "user_id,theme_id");
  if (questionRows.length) await upsertInBatches("question_notes", questionRows, "user_id,question_id");

  return { themes: themeRows.length, questions: questionRows.length };
}

export function withSyncTimeout(promise, ms = 45000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Sync timed out. Try Sync notes again.")), ms);
    }),
  ]).catch((err) => {
    setLastSyncError(err?.message || String(err));
    throw err;
  });
}

/** Download cloud notes first, then flush local edits (avoids empty local wiping cloud on new browsers). */
export async function pullNotesFromCloud() {
  if (!isCloudSyncEnabled()) return { themes: 0, questions: 0 };
  clearLastSyncError();
  const pulled = await pullAllNotesFromCloud();
  await flushPendingNotesNow();
  return pulled;
}

/** Push all local notes up, then pull cloud (use Sync notes button). */
export async function syncNotesWithCloud() {
  if (!isCloudSyncEnabled()) return { pushed: { themes: 0, questions: 0 }, pulled: { themes: 0, questions: 0 } };

  clearLastSyncError();
  await flushPendingNotesNow();
  const pushed = await pushLocalNotesToCloud();
  const pulled = await pullAllNotesFromCloud();
  return { pushed, pulled };
}

/** Pull latest cloud notes (e.g. after editing on another browser). */
export async function refreshNotesFromCloud() {
  if (!isCloudSyncEnabled()) return { themes: 0, questions: 0 };
  clearLastSyncError();
  return pullAllNotesFromCloud();
}

/** @param {() => void | Promise<void>} [onCloudRefresh] Called after pulling cloud notes when tab becomes visible. */
export function installNotesSyncLifecycle(onCloudRefresh) {
  let visiblePullTimer = null;

  const flushOnHide = () => {
    if (!isCloudSyncEnabled()) return;
    flushPendingNotesNow().catch((err) => {
      lastSyncError = err?.message || String(err);
      console.error("Notes flush on hide failed:", err);
    });
  };

  window.addEventListener("pagehide", flushOnHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushOnHide();
      return;
    }
    if (!isCloudSyncEnabled()) return;
    clearTimeout(visiblePullTimer);
    visiblePullTimer = setTimeout(() => {
      refreshNotesFromCloud()
        .then(() => onCloudRefresh?.())
        .catch((err) => {
          lastSyncError = err?.message || String(err);
          console.error("Notes pull on tab focus failed:", err);
        });
    }, 1200);
  });
}

/** @deprecated Use pushLocalNotesToCloud — kept as alias. */
export async function migrateLocalNotesToCloud() {
  return pushLocalNotesToCloud();
}

function hasContent(notes) {
  if (notes?.parts) return mathPartsHasContent(notes.parts);
  return Object.entries(notes).some(
    ([k, v]) => k !== "__locks" && k !== "__meta" && String(v).trim()
  );
}

export function themeNotesHaystack(themeId) {
  return Object.values(getThemeNotes(themeId)).join(" ").toLowerCase();
}

export function questionNotesHaystack(questionId, fileNotes) {
  const notes = getQuestionNotes(questionId, fileNotes);
  const meta = getQuestionMeta(questionId);
  const statusLabel = QUESTION_STATUSES.find((s) => s.id === meta.status)?.label || "";
  if (notes.parts) {
    return [
      ...MATH_PARTS.flatMap((p) => MATH_PART_TEXT_FIELDS.map((f) => notes.parts[p]?.[f.id])),
      statusLabel,
    ]
      .join(" ")
      .toLowerCase();
  }
  return [...Object.values(notes), statusLabel].join(" ").toLowerCase();
}

export async function fetchAllNotesForExport() {
  if (isCloudSyncEnabled()) {
    const [qRes, tRes] = await Promise.all([
      supabase.from("question_notes").select("*").eq("user_id", userId),
      supabase.from("theme_notes").select("*").eq("user_id", userId),
    ]);
    if (qRes.error) throw qRes.error;
    if (tRes.error) throw tRes.error;
    return { questions: qRes.data || [], themes: tRes.data || [] };
  }

  const localQ = loadLocal(LOCAL_QUESTION_KEY);
  const localT = loadLocal(LOCAL_THEME_KEY);
  const localMeta = loadLocalMetaStore();

  const questions = Object.entries(localQ).map(([question_id, notes]) => {
    const meta = localMeta[question_id] || DEFAULT_META;
    const paper = paperFromQuestionId(question_id);
    if (isMathPaper(paper)) {
      return {
        question_id,
        quotes: JSON.stringify(notes.parts || emptyMathParts()),
        study_status: meta.status,
        bookmarked: meta.bookmarked,
        status_updated_at: meta.statusUpdatedAt,
        last_revised_at: meta.lastRevisedAt,
      };
    }
    const row = { question_id, ...questionNotesToRow(question_id, { ...notes, __meta: meta }, "local") };
    return row;
  });

  const themes = Object.entries(localT).map(([key, notes]) => {
    const m = key.match(/^p(\d)-(.+)$/);
    if (!m) return null;
    return themeNotesToRow(m[2], Number(m[1]), notes, "local");
  }).filter(Boolean);

  return { questions, themes };
}

export function formatThemeNotesForExport(row) {
  const paper = row.paper;
  const lines = [`### ${row.theme_id} (Paper ${paper})`, ""];
  for (const f of getThemeNoteFields(paper)) {
    const val = row[f.db]?.trim();
    if (val) lines.push(`**${f.label}**`, "", val, "");
  }
  return lines;
}

export function formatQuestionNotesForExport(row) {
  const paper = paperFromQuestionId(row.question_id);
  const meta = parseMetaFromRow(row);
  const lines = [
    `### ${row.question_id}`,
    "",
    `- Status: ${meta.status}`,
    `- Bookmarked: ${meta.bookmarked ? "yes" : "no"}`,
    "",
  ];

  if (isMathPaper(paper)) {
    const notes = rowToQuestionNotes(row, paper);
    for (const part of MATH_PARTS) {
      const partNotes = notes.parts?.[part];
      if (!mathPartHasContent(partNotes)) continue;
      lines.push(`#### Part (${part})`, "");
      for (const f of MATH_PART_TEXT_FIELDS) {
        const val = partNotes[f.id]?.trim();
        if (val) lines.push(`**${f.label}**`, "", val, "");
      }
    }
    return lines;
  }

  for (const f of allQuestionNoteFields(paper)) {
    const val = row[f.db]?.trim();
    if (val) lines.push(`**${f.label}**`, "", val, "");
  }
  return lines;
}
