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

function parseMathPartsFromRow(row) {
  let parts = emptyMathParts();

  if (row?.quotes?.trim()) {
    try {
      const parsed = JSON.parse(row.quotes);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parts = mergeMathParts(parts, parsed);
      }
    } catch {
      /* legacy non-JSON quotes — ignore */
    }
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
    row.introduction = "";
    row.static_notes = "";
    row.quotes = JSON.stringify(notes.parts || emptyMathParts());
    row.current_affairs = "";
    row.topper_points = "";
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

/** @type {Map<string, Record<string, string>>} */
const themeCache = new Map();
/** @type {Map<string, Record<string, string>>} */
const questionCache = new Map();

const pendingTheme = new Map();
const pendingQuestion = new Map();
let themeTimer = null;
let questionTimer = null;

export function initNotesStore(client, uid) {
  supabase = client;
  userId = uid;
  themeCache.clear();
  questionCache.clear();
}

export function clearNotesStore() {
  supabase = null;
  userId = null;
  themeCache.clear();
  questionCache.clear();
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

  if (isCloudSyncEnabled()) {
    pendingTheme.set(themeId, { paper, notes: current });
    scheduleThemeFlush();
    return;
  }

  const local = loadLocal(LOCAL_THEME_KEY);
  const key = `p${paper}-${themeId}`;
  local[key] = current;
  saveLocal(LOCAL_THEME_KEY, local);
}

export async function loadQuestionNotesForIds(questionIds) {
  if (!questionIds.length) return;

  if (isCloudSyncEnabled()) {
    const missing = questionIds.filter((id) => !questionCache.has(id));
    if (!missing.length) return;

    const { data, error } = await supabase
      .from("question_notes")
      .select("*")
      .eq("user_id", userId)
      .in("question_id", missing);

    if (error) throw error;

    for (const row of data || []) {
      questionCache.set(row.question_id, rowToQuestionNotes(row));
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
    const fromCache = questionCache.get(questionId);
    if (fromCache?.parts) {
      return { parts: mergeMathParts(emptyMathParts(), fromCache.parts) };
    }

    const local = loadLocal(LOCAL_QUESTION_KEY)[questionId];
    if (local) {
      return parseLocalMathNotes(local);
    }

    return { parts: emptyMathParts() };
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

export function saveQuestionNote(questionId, fieldId, value) {
  const paper = paperFromQuestionId(questionId);
  if (isMathPaper(paper)) {
    saveMathPartNote(questionId, "a", fieldId, value);
    return;
  }

  const current = getQuestionNotes(questionId);
  current[fieldId] = value;
  questionCache.set(questionId, { ...current, __meta: getQuestionMeta(questionId) });

  if (isCloudSyncEnabled()) {
    pendingQuestion.set(questionId, current);
    scheduleQuestionFlush();
    return;
  }

  const local = loadLocal(LOCAL_QUESTION_KEY);
  if (!local[questionId]) local[questionId] = {};
  local[questionId][fieldId] = value;
  saveLocal(LOCAL_QUESTION_KEY, local);
}

export function saveMathPartNote(questionId, partId, fieldId, value) {
  if (!MATH_PARTS.includes(partId)) return;
  if (!MATH_PART_TEXT_FIELDS.some((f) => f.id === fieldId)) return;

  const current = getQuestionNotes(questionId);
  const parts = mergeMathParts(emptyMathParts(), current.parts);
  parts[partId][fieldId] = value;
  persistMathQuestionNotes(questionId, parts);
}

function persistMathQuestionNotes(questionId, parts) {
  const payload = { parts, __meta: getQuestionMeta(questionId) };
  questionCache.set(questionId, payload);

  if (isCloudSyncEnabled()) {
    pendingQuestion.set(questionId, payload);
    scheduleQuestionFlush();
    return;
  }

  const local = loadLocal(LOCAL_QUESTION_KEY);
  local[questionId] = payload;
  saveLocal(LOCAL_QUESTION_KEY, local);
}

function scheduleThemeFlush() {
  clearTimeout(themeTimer);
  themeTimer = setTimeout(() => flushThemeNotes(), 700);
}

function scheduleQuestionFlush() {
  clearTimeout(questionTimer);
  questionTimer = setTimeout(() => flushQuestionNotes(), 700);
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

    if (error) console.error("Theme note save failed:", error.message);
  }
}

async function flushQuestionNotes() {
  if (!isCloudSyncEnabled() || pendingQuestion.size === 0) return;

  const batch = [...pendingQuestion.entries()];
  pendingQuestion.clear();

  for (const [questionId, notes] of batch) {
    const row = questionNotesToRow(questionId, { ...notes, __meta: notes.__meta || getQuestionMeta(questionId) }, userId);
    const { error } = await supabase
      .from("question_notes")
      .upsert(row, { onConflict: "user_id,question_id" });

    if (error) console.error("Question note save failed:", error.message);
  }
}

/** Merge browser localStorage notes into cloud on first login. */
export async function migrateLocalNotesToCloud(papers, themesByPaper) {
  if (!isCloudSyncEnabled()) return { themes: 0, questions: 0 };

  let themeCount = 0;
  let questionCount = 0;

  const localThemes = loadLocal(LOCAL_THEME_KEY);
  for (const [key, notes] of Object.entries(localThemes)) {
    const m = key.match(/^p(\d)-(.+)$/);
    if (!m || !hasContent(notes)) continue;

    const paper = Number(m[1]);
    const themeId = m[2];
    const row = themeNotesToRow(themeId, paper, { ...emptyThemeNotes(paper), ...notes }, userId);
    const { error } = await supabase
      .from("theme_notes")
      .upsert(row, { onConflict: "user_id,theme_id", ignoreDuplicates: false });

    if (!error) themeCount += 1;
  }

  const localQuestions = loadLocal(LOCAL_QUESTION_KEY);
  const localMeta = loadLocalMetaStore();
  for (const [questionId, notes] of Object.entries(localQuestions)) {
    const meta = localMeta[questionId];
    if (!hasContent(notes) && (!meta || (meta.status === "not-started" && !meta.bookmarked))) continue;

    const paper = paperFromQuestionId(questionId);
    const payload = isMathPaper(paper) ? parseLocalMathNotes(notes) : { ...emptyQuestionNotes(paper), ...notes };
    const localMeta = loadLocalMetaStore()[questionId];
    if (localMeta) payload.__meta = { ...DEFAULT_META, ...localMeta };
    const row = questionNotesToRow(questionId, payload, userId);
    const { error } = await supabase
      .from("question_notes")
      .upsert(row, { onConflict: "user_id,question_id", ignoreDuplicates: false });

    if (!error) questionCount += 1;
  }

  return { themes: themeCount, questions: questionCount };
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
