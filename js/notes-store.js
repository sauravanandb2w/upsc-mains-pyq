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
    placeholder: "Which theorems / formulas this question needs…",
  },
  {
    id: "mistakes",
    db: "topper_points",
    label: "Mistakes to avoid",
    placeholder: "Sign errors, boundary cases, common traps…",
  },
  {
    id: "solutionNotes",
    db: "value_material",
    label: "Solution notes",
    placeholder: "Full solution sketch or reference link…",
  },
];

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
  return Object.fromEntries(allQuestionNoteFields(paper).map((f) => [f.id, ""]));
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
  const out = emptyQuestionNotes(resolvedPaper);
  if (!row) return out;
  for (const f of allQuestionNoteFields(resolvedPaper)) {
    out[f.id] = row[f.db] || "";
  }
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
      questionCache.set(id, { ...emptyQuestionNotes(), ...local[id] });
    }
  }
}

export function getQuestionNotes(questionId, fileNotes = {}) {
  const paper = paperFromQuestionId(questionId);
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
  const current = getQuestionNotes(questionId);
  current[fieldId] = value;
  questionCache.set(questionId, current);

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
    const row = questionNotesToRow(questionId, notes, userId);
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
  for (const [questionId, notes] of Object.entries(localQuestions)) {
    if (!hasContent(notes)) continue;

    const row = questionNotesToRow(questionId, { ...emptyQuestionNotes(paperFromQuestionId(questionId)), ...notes }, userId);
    const { error } = await supabase
      .from("question_notes")
      .upsert(row, { onConflict: "user_id,question_id", ignoreDuplicates: false });

    if (!error) questionCount += 1;
  }

  return { themes: themeCount, questions: questionCount };
}

function hasContent(notes) {
  return Object.values(notes).some((v) => String(v).trim());
}

export function themeNotesHaystack(themeId) {
  return Object.values(getThemeNotes(themeId)).join(" ").toLowerCase();
}

export function questionNotesHaystack(questionId, fileNotes) {
  return Object.values(getQuestionNotes(questionId, fileNotes)).join(" ").toLowerCase();
}
