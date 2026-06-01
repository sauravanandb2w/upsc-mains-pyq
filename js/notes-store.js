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
    out[part] = { ...base[part], ...(patch?.[part] || {}) };
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
  return { parts };
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
  if (stored?.parts) {
    return { parts: mergeMathParts(emptyMathParts(), stored.parts) };
  }

  const parts = emptyMathParts();
  const legacy = emptyMathPart();
  for (const f of MATH_PART_TEXT_FIELDS) {
    if (stored?.[f.id]?.trim()) legacy[f.id] = stored[f.id];
  }
  if (mathPartHasContent(legacy)) {
    parts.a = legacy;
  }
  return { parts };
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
  if (!row) return out;
  for (const f of getThemeNoteFields(paper)) {
    out[f.id] = row[f.db] || "";
  }
  return out;
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
  out.__meta = parseMetaFromRow(row);
  return out;
}

function themeNotesToRow(themeId, paper, notes, userId) {
  const row = { user_id: userId, theme_id: themeId, paper };
  for (const f of getThemeNoteFields(paper)) {
    row[f.db] = notes[f.id] || "";
  }
  return row;
}

function questionNotesToRow(questionId, notes, userId) {
  const paper = paperFromQuestionId(questionId);
  const row = { user_id: userId, question_id: questionId };
  const meta = notes.__meta || getQuestionMeta(questionId);

  row.study_status = meta.status || "not-started";
  row.bookmarked = Boolean(meta.bookmarked);
  row.status_updated_at = meta.statusUpdatedAt || null;
  row.last_revised_at = meta.lastRevisedAt || null;

  if (isMathPaper(paper)) {
    const json = JSON.stringify(notes.parts || emptyMathParts());
    const partA = notes.parts?.a || emptyMathPart();
    row.introduction = partA.approach || "";
    row.static_notes = partA.standardResultsUsed || "";
    row.topper_points = partA.mistakes || "";
    row.quotes = json;
    row.current_affairs = "";
    row.value_material = "";
    row.best_answer_online = "";
    return row;
  }

  for (const f of allQuestionNoteFields(paper)) {
    row[f.db] = notes[f.id] || "";
  }
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
  if (isCloudSyncEnabled()) {
    const { data, error } = await supabase
      .from("theme_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("paper", paper);

    if (error) throw error;

    for (const row of data || []) {
      themeCache.set(row.theme_id, rowToThemeNotes(row, paper));
    }
    return;
  }

  const local = loadLocal(LOCAL_THEME_KEY);
  for (const [themeId, notes] of Object.entries(local)) {
    if (themeId.startsWith(`p${paper}-`)) {
      themeCache.set(themeId.slice(`p${paper}-`.length), {
        ...emptyThemeNotes(paper),
        ...notes,
      });
    }
  }
}

export function getThemeNotes(themeId, paper = null) {
  return { ...emptyThemeNotes(paper), ...(themeCache.get(themeId) || {}) };
}

export function saveThemeNote(themeId, paper, fieldId, value) {
  const current = getThemeNotes(themeId);
  current[fieldId] = value;
  themeCache.set(themeId, current);

  import("./activity-tracker.js")
    .then(({ recordNoteActivity }) => recordNoteActivity("theme", `p${paper}-${themeId}`, fieldId, value))
    .catch(() => {});

  const local = loadLocal(LOCAL_THEME_KEY);
  const key = `p${paper}-${themeId}`;
  local[key] = current;
  saveLocal(LOCAL_THEME_KEY, local);

  if (isCloudSyncEnabled()) {
    pendingTheme.set(themeId, { paper, notes: current });
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
        questionCache.set(row.question_id, rowToQuestionNotes(row));
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
    return mergeMathNotesFromSources(questionId);
  }

  const fromCache = questionCache.get(questionId);
  if (fromCache) return { ...emptyQuestionNotes(paper), ...fromCache };

  const local = loadLocal(LOCAL_QUESTION_KEY)[questionId] || {};
  const merged = { ...emptyQuestionNotes(paper), ...fileNotes };
  for (const f of allQuestionNoteFields(paper)) {
    if (local[f.id]?.trim()) merged[f.id] = local[f.id];
  }
  return merged;
}

/** Same cloud path for GS and math: localStorage → cache → pendingQuestion → flush. */
function persistQuestionNotes(questionId, payload) {
  const paper = paperFromQuestionId(questionId);
  const withMeta = { ...payload, __meta: payload.__meta || getQuestionMeta(questionId) };
  questionCache.set(questionId, withMeta);
  writeLocalQuestionNotes(questionId, withMeta, paper);

  if (isCloudSyncEnabled()) {
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

  const current = getQuestionNotes(questionId);
  current[fieldId] = value;

  import("./activity-tracker.js")
    .then(({ recordNoteActivity }) => recordNoteActivity("question", questionId, fieldId, value))
    .catch(() => {});

  persistQuestionNotes(questionId, current);
}

export function saveMathPartNote(questionId, partId, fieldId, value) {
  if (!MATH_PARTS.includes(partId)) return;
  if (!MATH_PART_TEXT_FIELDS.some((f) => f.id === fieldId)) return;

  const current = getQuestionNotes(questionId);
  const parts = mergeMathParts(emptyMathParts(), current.parts);
  parts[partId][fieldId] = value;
  import("./activity-tracker.js")
    .then(({ recordNoteActivity }) =>
      recordNoteActivity("question", questionId, `${partId}:${fieldId}`, value)
    )
    .catch(() => {});
  persistQuestionNotes(questionId, { parts });
}

function writeLocalQuestionNotes(questionId, notes, paper = null) {
  const resolvedPaper = paper ?? paperFromQuestionId(questionId);
  const local = loadLocal(LOCAL_QUESTION_KEY);
  if (isMathPaper(resolvedPaper)) {
    local[questionId] = { parts: notes.parts || emptyMathParts() };
  } else {
    if (!local[questionId] || typeof local[questionId] !== "object") {
      local[questionId] = {};
    }
    for (const f of allQuestionNoteFields(resolvedPaper)) {
      if (notes[f.id] !== undefined) local[questionId][f.id] = notes[f.id];
    }
  }
  saveLocal(LOCAL_QUESTION_KEY, local);
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

async function flushThemeNotes() {
  if (!isCloudSyncEnabled() || pendingTheme.size === 0) return;

  const batch = [...pendingTheme.entries()];
  pendingTheme.clear();

  for (const [themeId, { paper, notes }] of batch) {
    const row = themeNotesToRow(themeId, paper, notes, userId);
    const { error } = await supabase
      .from("theme_notes")
      .upsert(row, { onConflict: "user_id,theme_id" });

    if (error) {
      lastSyncError = error.message;
      console.error("Theme note save failed:", error.message);
    }
  }
}

async function flushQuestionNotes() {
  if (!isCloudSyncEnabled() || pendingQuestion.size === 0) return;

  const batch = [...pendingQuestion.entries()];
  pendingQuestion.clear();

  for (const [questionId, notes] of batch) {
    const paper = paperFromQuestionId(questionId);
    let payload;
    if (isMathPaper(paper)) {
      const merged = mergeMathNotesFromSources(questionId);
      if (!mathPartsHasContent(merged.parts)) continue;
      payload = { parts: merged.parts, __meta: getQuestionMeta(questionId) };
      questionCache.set(questionId, payload);
      writeLocalQuestionNotes(questionId, payload, paper);
    } else {
      payload = { ...notes, __meta: notes.__meta || getQuestionMeta(questionId) };
      if (!hasContent(payload)) continue;
    }

    const row = questionNotesToRow(questionId, payload, userId);
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
  const parsed = rowToQuestionNotes(row);
  questionCache.set(row.question_id, parsed);
  const paper = paperFromQuestionId(row.question_id);
  if (isMathPaper(paper)) {
    writeLocalQuestionNotes(row.question_id, { parts: parsed.parts }, paper);
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
  for (const row of tRes.data || []) {
    const notes = rowToThemeNotes(row, row.paper);
    themeCache.set(row.theme_id, notes);
    localThemes[`p${row.paper}-${row.theme_id}`] = notes;
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
    if (!m || !hasContent(notes)) continue;
    const paper = Number(m[1]);
    themeRows.push(themeNotesToRow(m[2], paper, { ...emptyThemeNotes(paper), ...notes }, userId));
  }

  const questionRows = [];
  const localMeta = loadLocalMetaStore();
  for (const [questionId, notes] of Object.entries(loadLocal(LOCAL_QUESTION_KEY))) {
    const meta = localMeta[questionId];
    if (!hasContent(notes) && (!meta || (meta.status === "not-started" && !meta.bookmarked))) continue;
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

/** Flush pending edits and download from cloud (fast; use on sign-in). */
export async function pullNotesFromCloud() {
  if (!isCloudSyncEnabled()) return { themes: 0, questions: 0 };
  clearLastSyncError();
  await flushPendingNotesNow();
  return pullAllNotesFromCloud();
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

export function installNotesSyncLifecycle() {
  const flushOnHide = () => {
    if (!isCloudSyncEnabled()) return;
    flushPendingNotesNow().catch((err) => {
      lastSyncError = err?.message || String(err);
      console.error("Notes flush on hide failed:", err);
    });
  };

  window.addEventListener("pagehide", flushOnHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushOnHide();
  });
}

/** @deprecated Use pushLocalNotesToCloud — kept as alias. */
export async function migrateLocalNotesToCloud() {
  return pushLocalNotesToCloud();
}

function hasContent(notes) {
  if (notes?.parts) return mathPartsHasContent(notes.parts);
  return Object.values(notes).some((v) => String(v).trim());
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
