import {
  renderStudyMaterials,
  bindLazyStudyMaterials,
} from "./study-materials.js";
import {
  constitutionPanelHtml,
  mountConstitutionPanel,
  isPolityTheme,
  isPolityQuestion,
} from "./constitution-ref.js";
import {
  initSupabase,
  isSupabaseConfigured,
  getSupabase,
  onAuthStateChange,
  getSession,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
} from "./supabase-client.js";
import {
  THEME_NOTE_FIELDS,
  QUESTION_NOTE_FIELDS,
  BEST_ANSWER_FIELD,
  initNotesStore,
  clearNotesStore,
  getSyncStatus,
  loadThemeNotesForPaper,
  getThemeNotes,
  saveThemeNote,
  loadQuestionNotesForIds,
  getQuestionNotes,
  saveQuestionNote,
  migrateLocalNotesToCloud,
  themeNotesHaystack,
  questionNotesHaystack,
} from "./notes-store.js";

/** @type {Record<number, { title: string; syllabus: string; themes?: string[]; questions: object[] }>} */
let papers = {};
/** @type {Record<string, { label: string; themes: { id: string; name: string }[] }>} */
let themeConfig = {};

const state = {
  paper: 1,
  viewMode: "themes",
  selectedThemeId: null,
  year: "all",
  marks: "all",
  theme: "all",
  search: "",
  authTab: "signin",
};

/** @type {import('@supabase/supabase-js').User | null} */
let currentUser = null;

const els = {
  syncBadge: document.getElementById("syncBadge"),
  authArea: document.getElementById("authArea"),
  authOpenBtn: document.getElementById("authOpenBtn"),
  authDialog: document.getElementById("authDialog"),
  authForm: document.getElementById("authForm"),
  authCloseBtn: document.getElementById("authCloseBtn"),
  authDialogTitle: document.getElementById("authDialogTitle"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authError: document.getElementById("authError"),
  authSubmitBtn: document.getElementById("authSubmitBtn"),
  authGoogleBtn: document.getElementById("authGoogleBtn"),
  authConfigNote: document.getElementById("authConfigNote"),
  paperTabs: document.querySelectorAll(".paper-tab"),
  viewTabs: document.querySelectorAll(".view-tab"),
  themeView: document.getElementById("themeView"),
  themeListView: document.getElementById("themeListView"),
  themeDetailView: document.getElementById("themeDetailView"),
  themeGrid: document.getElementById("themeGrid"),
  themePaperMeta: document.getElementById("themePaperMeta"),
  themeDetailMeta: document.getElementById("themeDetailMeta"),
  themeSaveHint: document.getElementById("themeSaveHint"),
  themeNotesEditor: document.getElementById("themeNotesEditor"),
  themeStudyPanel: document.getElementById("themeStudyPanel"),
  themeStudyMaterials: document.getElementById("themeStudyMaterials"),
  themeRelatedQuestions: document.getElementById("themeRelatedQuestions"),
  themeBackBtn: document.getElementById("themeBackBtn"),
  questionView: document.getElementById("questionView"),
  searchInput: document.getElementById("searchInput"),
  yearFilter: document.getElementById("yearFilter"),
  marksFilter: document.getElementById("marksFilter"),
  themeFilter: document.getElementById("themeFilter"),
  clearFilters: document.getElementById("clearFilters"),
  paperMeta: document.getElementById("paperMeta"),
  statsBar: document.getElementById("statsBar"),
  dataNote: document.getElementById("dataNote"),
  questionsList: document.getElementById("questionsList"),
  emptyState: document.getElementById("emptyState"),
  themeToggle: document.getElementById("themeToggle"),
};

function initTheme() {
  const saved = localStorage.getItem("upsc-pyq-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("upsc-pyq-theme", next);
}

function updateSyncBadge() {
  const status = getSyncStatus();
  if (status === "cloud" && currentUser) {
    els.syncBadge.textContent = "Synced";
    els.syncBadge.className = "sync-badge sync-badge--cloud";
    els.themeSaveHint.textContent = "Notes auto-save to cloud as you type.";
  } else if (isSupabaseConfigured()) {
    els.syncBadge.textContent = "Sign in to sync";
    els.syncBadge.className = "sync-badge sync-badge--warn";
    els.themeSaveHint.textContent = "Notes save locally. Sign in to sync across devices.";
  } else {
    els.syncBadge.textContent = "Local only";
    els.syncBadge.className = "sync-badge";
    els.themeSaveHint.textContent = "Notes save in this browser. Set up Supabase to sync (see SUPABASE_SETUP.md).";
  }
}

function renderAuthArea() {
  if (currentUser) {
    const email = currentUser.email || "Signed in";
    els.authArea.innerHTML = `
      <span class="auth-user" title="${escapeAttr(email)}">${escapeHtml(email.split("@")[0])}</span>
      <button type="button" class="btn-ghost btn-sm" id="signOutBtn">Sign out</button>
    `;
    document.getElementById("signOutBtn").addEventListener("click", () => signOut());
  } else {
    els.authArea.innerHTML =
      '<button type="button" class="btn-primary btn-sm" id="authOpenBtn">Sign in</button>';
    document.getElementById("authOpenBtn").addEventListener("click", openAuthDialog);
  }
}

function openAuthDialog() {
  els.authError.classList.add("hidden");
  els.authConfigNote.classList.toggle("hidden", isSupabaseConfigured());
  els.authDialog.showModal();
}

function closeAuthDialog() {
  els.authDialog.close();
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  if (!isSupabaseConfigured()) {
    showAuthError("Configure js/config.js first (see SUPABASE_SETUP.md).");
    return;
  }

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  els.authSubmitBtn.disabled = true;

  try {
    const fn = state.authTab === "signup" ? signUpWithEmail : signInWithEmail;
    const { error } = await fn(email, password);
    if (error) throw error;

    if (state.authTab === "signup") {
      showAuthError("Check your email to confirm, then sign in.", false);
    } else {
      closeAuthDialog();
    }
  } catch (err) {
    showAuthError(err.message || "Authentication failed.");
  } finally {
    els.authSubmitBtn.disabled = false;
  }
}

function showAuthError(msg, isError = true) {
  els.authError.textContent = msg;
  els.authError.classList.toggle("hidden", !msg);
  els.authError.classList.toggle("auth-error--info", !isError);
}

async function handleGoogleSignIn() {
  if (!isSupabaseConfigured()) {
    showAuthError("Configure js/config.js first.");
    return;
  }
  const { error } = await signInWithGoogle();
  if (error) showAuthError(error.message);
}

function setAuthTab(tab) {
  state.authTab = tab;
  document.querySelectorAll(".auth-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.authTab === tab);
  });
  const isSignUp = tab === "signup";
  els.authDialogTitle.textContent = isSignUp ? "Create account" : "Sign in";
  els.authSubmitBtn.textContent = isSignUp ? "Sign up" : "Sign in";
  els.authPassword.autocomplete = isSignUp ? "new-password" : "current-password";
}

async function onUserSession(session) {
  currentUser = session?.user ?? null;

  if (currentUser && getSupabase()) {
    initNotesStore(getSupabase(), currentUser.id);
    const migratedKey = `upsc-pyq-migrated-${currentUser.id}`;
    if (!localStorage.getItem(migratedKey)) {
      await migrateLocalNotesToCloud(papers, themeConfig);
      localStorage.setItem(migratedKey, "1");
    }
  } else {
    clearNotesStore();
  }

  renderAuthArea();
  updateSyncBadge();
  await refreshView();
}

async function refreshView() {
  if (state.viewMode === "themes") {
    await renderThemeView();
  } else {
    await renderQuestionView();
  }
}

function getThemesForPaper(paperNum) {
  return themeConfig[String(paperNum)]?.themes || [];
}

function getThemeById(paperNum, themeId) {
  return getThemesForPaper(paperNum).find((t) => t.id === themeId);
}

function countQuestionsForTheme(paperNum, themeId) {
  const paper = papers[paperNum];
  if (!paper) return 0;
  return paper.questions.filter((q) => q.themeId === themeId).length;
}

function themeHasNotes(themeId) {
  const notes = getThemeNotes(themeId);
  return Object.values(notes).some((v) => String(v).trim());
}

async function renderThemeView() {
  els.themeView.classList.remove("hidden");
  els.questionView.classList.add("hidden");

  const paper = papers[state.paper];
  if (!paper) return;

  await loadThemeNotesForPaper(state.paper);

  if (state.selectedThemeId) {
    els.themeListView.classList.add("hidden");
    els.themeDetailView.classList.remove("hidden");
    await renderThemeDetail(state.selectedThemeId);
  } else {
    els.themeListView.classList.remove("hidden");
    els.themeDetailView.classList.add("hidden");
    renderThemeGrid(paper);
  }
}

function renderThemeGrid(paper) {
  const themes = getThemesForPaper(state.paper);

  els.themePaperMeta.innerHTML = `
    <h2>${escapeHtml(paper.title)} — Themes</h2>
    <p>${escapeHtml(paper.syllabus)}</p>
    <p class="meta-range">Syllabus-aligned sub-themes · Notes sync when signed in</p>
  `;

  const groups = [];
  const seenParents = new Set();
  for (const t of themes) {
    if (t.parent) {
      if (!seenParents.has(t.parent)) {
        seenParents.add(t.parent);
        groups.push({ label: t.parent, themes: themes.filter((x) => x.parent === t.parent) });
      }
    } else {
      groups.push({ label: null, themes: [t] });
    }
  }

  els.themeGrid.innerHTML = groups
    .map((group) => {
      const heading = group.label
        ? `<h3 class="theme-group-title">${escapeHtml(group.label)}</h3>`
        : "";
      const cards = group.themes
        .map((t) => {
          const count = countQuestionsForTheme(state.paper, t.id);
          const hasNotes = themeHasNotes(t.id);
          return `
            <button type="button" class="theme-card" data-theme-id="${escapeAttr(t.id)}" role="listitem">
              <span class="theme-card-name">${escapeHtml(t.name)}</span>
              <span class="theme-card-meta">${count} PYQ${count === 1 ? "" : "s"}${hasNotes ? " · has notes" : ""}</span>
            </button>
          `;
        })
        .join("");
      return `${heading}<div class="theme-group-grid">${cards}</div>`;
    })
    .join("");

  els.themeGrid.querySelectorAll(".theme-card").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.selectedThemeId = btn.dataset.themeId;
      await renderThemeView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

async function renderThemeDetail(themeId) {
  const theme = getThemeById(state.paper, themeId);
  const paper = papers[state.paper];
  if (!theme || !paper) return;

  const notes = getThemeNotes(themeId);
  const related = paper.questions
    .filter((q) => q.themeId === themeId)
    .sort((a, b) => b.year - a.year || String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));

  els.themeDetailMeta.innerHTML = `
    <h2>${escapeHtml(theme.name)}</h2>
    <p>${theme.parent ? `${escapeHtml(theme.parent)} · ` : ""}${escapeHtml(paper.title)} · ${related.length} related PYQ${related.length === 1 ? "" : "s"}</p>
  `;

  els.themeNotesEditor.innerHTML = THEME_NOTE_FIELDS.map(
    (f) => `
      <label class="note-field">
        <span class="note-label">${f.label}</span>
        <textarea
          data-theme-id="${escapeAttr(themeId)}"
          data-field="${escapeAttr(f.id)}"
          rows="${f.id === "brainstorm" ? 8 : 4}"
          placeholder="${escapeAttr(f.placeholder)}"
        >${escapeHtml(notes[f.id] || "")}</textarea>
      </label>
    `
  ).join("");

  els.themeNotesEditor.querySelectorAll("textarea").forEach((ta) => {
    ta.addEventListener(
      "input",
      debounce(() => {
        saveThemeNote(ta.dataset.themeId, state.paper, ta.dataset.field, ta.value);
        updateSyncBadge();
      }, 400)
    );
  });

  els.themeRelatedQuestions.innerHTML = related.length
    ? related
        .map(
          (q) => `
          <article class="related-q">
            <div class="question-header">
              <span class="badge">${q.year}</span>
              <span class="badge marks">${formatMarks(q.marks)}</span>
              <span class="question-num">Q.${q.number}</span>
            </div>
            <p class="question-text">${escapeHtml(q.text)}</p>
          </article>
        `
        )
        .join("")
    : '<p class="empty-inline">No PYQs tagged to this theme yet.</p>';

  const studyPath = `study/themes/${themeId}`;
  const hasStudy = await renderStudyMaterials(studyPath, els.themeStudyMaterials);
  els.themeStudyPanel.classList.toggle("hidden", !hasStudy);

  let constitutionHost = document.getElementById("themeConstitutionHost");
  if (isPolityTheme(theme)) {
    if (!constitutionHost) {
      constitutionHost = document.createElement("div");
      constitutionHost.id = "themeConstitutionHost";
      els.themeStudyPanel.insertAdjacentElement("afterend", constitutionHost);
    }
    constitutionHost.innerHTML = constitutionPanelHtml();
    constitutionHost.classList.remove("hidden");
    const body = constitutionHost.querySelector(".constitution-panel-body");
    await mountConstitutionPanel(body, {
      relatedTexts: related.map((q) => q.text),
    });
  } else if (constitutionHost) {
    constitutionHost.classList.add("hidden");
    constitutionHost.innerHTML = "";
  }
}

function getYearsForPaper(paperNum) {
  const paper = papers[paperNum];
  if (!paper) return [];
  return [...new Set(paper.questions.map((q) => q.year))].sort((a, b) => b - a);
}

function populateYearFilter() {
  const years = getYearsForPaper(state.paper);
  els.yearFilter.innerHTML = '<option value="all">All years</option>';
  for (let y = 2025; y >= 2013; y--) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = years.includes(y) ? String(y) : `${y} (pending)`;
    opt.disabled = !years.includes(y);
    els.yearFilter.appendChild(opt);
  }
  els.yearFilter.value = state.year;
}

function populateThemeFilter() {
  const themes = getThemesForPaper(state.paper);
  const prev = state.theme;
  els.themeFilter.innerHTML = '<option value="all">All themes</option>';

  const standalone = themes.filter((t) => !t.parent);
  const parentNames = [...new Set(themes.filter((t) => t.parent).map((t) => t.parent))];

  standalone.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = t.name;
    els.themeFilter.appendChild(opt);
  });

  parentNames.forEach((parent) => {
    const group = document.createElement("optgroup");
    group.label = parent;
    themes
      .filter((t) => t.parent === parent)
      .forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.name;
        opt.textContent = t.name;
        group.appendChild(opt);
      });
    els.themeFilter.appendChild(group);
  });

  const allNames = themes.map((t) => t.name);
  if (prev !== "all" && allNames.includes(prev)) {
    els.themeFilter.value = prev;
  } else {
    state.theme = "all";
    els.themeFilter.value = "all";
  }
}

function normalizeMarks(marks) {
  if (typeof marks === "string" && marks.toLowerCase().includes("case")) return "case";
  return String(marks);
}

function questionHaystack(q) {
  return [
    q.text,
    q.theme,
    ...(q.subthemes || []),
    questionNotesHaystack(q.id, q.notes),
  ]
    .join(" ")
    .toLowerCase();
}

function filterQuestions(questions) {
  const term = state.search.trim().toLowerCase();

  return questions.filter((q) => {
    if (state.year !== "all" && String(q.year) !== state.year) return false;
    if (state.theme !== "all" && q.theme !== state.theme) return false;

    const qMarks = normalizeMarks(q.marks);
    if (state.marks !== "all") {
      if (state.marks === "case" && qMarks !== "case") return false;
      if (state.marks !== "case" && qMarks !== state.marks) return false;
    }

    if (!term) return true;
    return questionHaystack(q).includes(term);
  });
}

function renderPaperMeta(paper) {
  els.paperMeta.innerHTML = `
    <h2>${paper.title}</h2>
    <p>${paper.syllabus}</p>
    <p class="meta-range">Questions · Filter by year, theme, marks · Per-question notes below</p>
  `;
}

function renderStats(filtered, total) {
  const years = [...new Set(filtered.map((q) => q.year))].sort((a, b) => b - a);
  const yearSpan =
    years.length > 0
      ? years.length === 1
        ? years[0]
        : `${years[years.length - 1]}–${years[0]}`
      : "—";
  const themes = new Set(filtered.map((q) => q.theme)).size;

  els.statsBar.textContent = `Showing ${filtered.length} of ${total} · Years: ${yearSpan} · Themes in view: ${themes}`;
}

function formatMarks(marks) {
  if (typeof marks === "string" && marks.toLowerCase().includes("case")) {
    return "Case study";
  }
  return `${marks} marks`;
}

function renderQuestionNotesEditor(q) {
  return QUESTION_NOTE_FIELDS.map(
    (f) => `
      <label class="note-field">
        <span class="note-label">${f.label}</span>
        <textarea
          data-qid="${escapeAttr(q.id)}"
          data-field="${escapeAttr(f.id)}"
          rows="3"
          placeholder="${escapeAttr(f.placeholder)}"
        ></textarea>
      </label>
    `
  ).join("");
}

function bindQuestionNoteEditors(card, q) {
  const notes = getQuestionNotes(q.id, q.notes);
  card.querySelectorAll("textarea[data-qid]").forEach((ta) => {
    ta.value = notes[ta.dataset.field] || "";
    ta.addEventListener(
      "input",
      debounce(() => {
        saveQuestionNote(ta.dataset.qid, ta.dataset.field, ta.value);
      }, 400)
    );
  });
}

function renderBestAnswerSection(q) {
  return `
    <div class="best-answer-section">
      <label class="note-field best-answer-field">
        <span class="note-label">${BEST_ANSWER_FIELD.label}</span>
        <span class="best-answer-hint">Synced like your other notes · paste model answers from the web</span>
        <textarea
          data-qid="${escapeAttr(q.id)}"
          data-field="${escapeAttr(BEST_ANSWER_FIELD.id)}"
          rows="8"
          placeholder="${escapeAttr(BEST_ANSWER_FIELD.placeholder)}"
        ></textarea>
      </label>
    </div>
  `;
}

function renderQuestions(questions) {
  els.questionsList.innerHTML = "";

  questions.forEach((q) => {
    const card = document.createElement("article");
    card.className = "question-card";
    card.setAttribute("role", "listitem");

    const subHtml =
      q.subthemes && q.subthemes.length
        ? `<ul class="question-topics subthemes">${q.subthemes
            .map((t) => `<li>${escapeHtml(t)}</li>`)
            .join("")}</ul>`
        : "";

    const themeLink = q.themeId
      ? `<button type="button" class="link-theme" data-theme-id="${escapeAttr(q.themeId)}">Open theme notes →</button>`
      : "";

    card.innerHTML = `
      <div class="question-header">
        <span class="badge">${q.year}</span>
        <span class="badge marks">${formatMarks(q.marks)}</span>
        <span class="badge theme-badge">${escapeHtml(q.theme || "—")}</span>
        <span class="question-num">Q.${q.number}</span>
      </div>
      <p class="question-text">${escapeHtml(q.text)}</p>
      ${subHtml}
      ${themeLink}
      <details class="study-details">
        <summary>Your notes for this question (text · synced)</summary>
        <div class="notes-editor">${renderQuestionNotesEditor(q)}</div>
      </details>
      <details class="study-materials-details">
        <summary>Diagrams &amp; images</summary>
        <div class="study-materials-body" data-study-path="study/questions/${escapeAttr(q.id)}"></div>
      </details>
      ${isPolityQuestion(q) ? constitutionPanelHtml() : ""}
      ${renderBestAnswerSection(q)}
    `;

    const studyDetails = card.querySelector(".study-materials-details");
    if (studyDetails) {
      bindLazyStudyMaterials(
        studyDetails,
        `study/questions/${q.id}`
      );
    }

    const constitutionBody = card.querySelector(".constitution-panel-body");
    if (constitutionBody) {
      mountConstitutionPanel(constitutionBody, { contextText: q.text });
    }

    const themeBtn = card.querySelector(".link-theme");
    if (themeBtn) {
      themeBtn.addEventListener("click", async () => {
        state.viewMode = "themes";
        state.selectedThemeId = themeBtn.dataset.themeId;
        setViewMode("themes");
        await renderThemeView();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    bindQuestionNoteEditors(card, q);
    els.questionsList.appendChild(card);
  });

  els.emptyState.classList.toggle("hidden", questions.length > 0);
}

function updateDataNote(paper) {
  const years = new Set(paper.questions.map((q) => q.year));
  const missing = [];
  for (let y = 2013; y <= 2025; y++) {
    if (!years.has(y)) missing.push(y);
  }
  const target = 20;
  const thin = [];
  for (let y = 2013; y <= 2025; y++) {
    const n = paper.questions.filter((q) => q.year === y).length;
    if (years.has(y) && n < (paper.paper === 4 ? 8 : target)) thin.push(`${y}(${n})`);
  }
  let msg = missing.length
    ? `Missing years: ${missing.join(", ")}. Run python3 scripts/build-pyq-data.py to fetch more.`
    : "All years 2013–2025 represented (verify counts against official papers).";
  if (thin.length) msg += ` Thin coverage: ${thin.join(", ")}.`;
  els.dataNote.textContent = msg;
}

async function renderQuestionView() {
  els.themeView.classList.add("hidden");
  els.questionView.classList.remove("hidden");

  const paper = papers[state.paper];
  if (!paper) return;

  const filtered = filterQuestions(paper.questions);

  filtered.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
  });

  await loadQuestionNotesForIds(filtered.map((q) => q.id));

  renderPaperMeta(paper);
  renderStats(filtered, paper.questions.length);
  updateDataNote(paper);
  renderQuestions(filtered);
}

function setViewMode(mode) {
  state.viewMode = mode;
  els.viewTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === mode);
  });
}

async function setActivePaper(paperNum) {
  state.paper = paperNum;
  state.year = "all";
  state.theme = "all";
  state.selectedThemeId = null;

  els.paperTabs.forEach((tab) => {
    tab.classList.toggle("active", Number(tab.dataset.paper) === paperNum);
  });

  populateYearFilter();
  populateThemeFilter();
  await refreshView();
}

function clearAllFilters() {
  state.search = "";
  state.year = "all";
  state.marks = "all";
  state.theme = "all";
  els.searchInput.value = "";
  els.yearFilter.value = "all";
  els.marksFilter.value = "all";
  els.themeFilter.value = "all";
  renderQuestionView();
}

function bindEvents() {
  els.paperTabs.forEach((tab) => {
    tab.addEventListener("click", () => setActivePaper(Number(tab.dataset.paper)));
  });

  els.viewTabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      setViewMode(tab.dataset.view);
      if (tab.dataset.view === "themes") {
        state.selectedThemeId = null;
      }
      await refreshView();
    });
  });

  els.themeBackBtn.addEventListener("click", async () => {
    state.selectedThemeId = null;
    await renderThemeView();
  });

  els.searchInput.addEventListener(
    "input",
    debounce((e) => {
      state.search = e.target.value;
      renderQuestionView();
    }, 200)
  );

  els.yearFilter.addEventListener("change", (e) => {
    state.year = e.target.value;
    renderQuestionView();
  });

  els.marksFilter.addEventListener("change", (e) => {
    state.marks = e.target.value;
    renderQuestionView();
  });

  els.themeFilter.addEventListener("change", (e) => {
    state.theme = e.target.value;
    renderQuestionView();
  });

  els.clearFilters.addEventListener("click", clearAllFilters);
  els.themeToggle.addEventListener("click", toggleTheme);

  els.authOpenBtn?.addEventListener("click", openAuthDialog);
  els.authCloseBtn.addEventListener("click", closeAuthDialog);
  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.authGoogleBtn.addEventListener("click", handleGoogleSignIn);

  document.querySelectorAll(".auth-tab").forEach((btn) => {
    btn.addEventListener("click", () => setAuthTab(btn.dataset.authTab));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

async function loadData() {
  const ids = [1, 2, 3, 4];
  const [themeData, ...paperResults] = await Promise.all([
    fetchJson("data/themes.json"),
    ...ids.map((n) => fetchJson(`data/gs-paper-${n}.json`)),
  ]);

  themeConfig = themeData;
  ids.forEach((n, i) => {
    papers[n] = paperResults[i];
  });
}

initTheme();
bindEvents();

(async () => {
  try {
    await loadData();
    await initSupabase();

    if (isSupabaseConfigured()) {
      onAuthStateChange((session) => onUserSession(session));
      const session = await getSession();
      await onUserSession(session);
    } else {
      updateSyncBadge();
      renderAuthArea();
    }

    await setActivePaper(1);
  } catch (err) {
    console.error(err);
    els.themeGrid.innerHTML =
      '<p class="empty-state">Could not load data. Serve with: python3 -m http.server 8080</p>';
  }
})();
