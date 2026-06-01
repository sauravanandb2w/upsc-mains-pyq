import {
  renderStudyMaterials,
  bindLazyStudyMaterials,
  studyPathForTheme,
} from "./study-materials.js";
import { assetUrl } from "./paths.js";
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
  getThemeNoteFields,
  getQuestionNoteFields,
  isMathPaper,
  initNotesStore,
  clearNotesStore,
  getSyncStatus,
  loadThemeNotesForPaper,
  getThemeNotes,
  saveThemeNote,
  loadQuestionNotesForIds,
  getQuestionNotes,
  saveQuestionNote,
  saveMathPartNote,
  MATH_PARTS,
  MATH_PART_TEXT_FIELDS,
  MATH_PART_NOTE_FIELDS,
  migrateLocalNotesToCloud,
  themeNotesHaystack,
  questionNotesHaystack,
} from "./notes-store.js";
import { loadRepoSolutionScans, solutionScanGitCommand } from "./solution-scans.js";
import {
  renderGitHubUploadButton,
  renderGitHubConnectHint,
  bindGitHubHeaderButton,
  bindStudyMaterialsUpload,
  bindThemeStudyUpload,
  bindAllGitHubUploadControls,
} from "./github-upload-ui.js";
import { initGitHubUploadConfig } from "./github-auth.js";

/** @type {Record<number, { title: string; syllabus: string; themes?: string[]; questions: object[] }>} */
let papers = {};
/** @type {Record<string, { label: string; themes: { id: string; name: string }[] }>} */
let themeConfig = {};

const state = {
  subject: "gs",
  paper: 1,
  viewMode: "themes",
  selectedThemeId: null,
  year: "all",
  marks: "all",
  theme: "all",
  section: "all",
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
  subjectTabs: document.querySelectorAll(".subject-tab"),
  paperNavGs: document.getElementById("paperNavGs"),
  paperNavMath: document.getElementById("paperNavMath"),
  sectionFilterGroup: document.getElementById("sectionFilterGroup"),
  sectionFilter: document.getElementById("sectionFilter"),
  viewTabThemes: document.querySelector('.view-tab[data-view="themes"]'),
  githubConnectBtn: document.getElementById("githubConnectBtn"),
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
  return paper.questions.filter((q) => q.themeId === themeId || q.moduleId === themeId).length;
}

function themeHasNotes(themeId, paper = state.paper) {
  const notes = getThemeNotes(themeId, paper);
  return Object.values(notes).some((v) => String(v).trim());
}

function moduleSectionLabel(theme) {
  if (theme.section) return `Section ${theme.section}`;
  return theme.parent || "";
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
  const isMath = isMathPaper(state.paper);

  els.themePaperMeta.innerHTML = `
    <h2>${escapeHtml(paper.title)} — ${isMath ? "Modules" : "Themes"}</h2>
    <p>${escapeHtml(paper.syllabus)}</p>
    <p class="meta-range">${isMath ? "Section A & B · Notebook scans in study/modules/ · Notes sync when signed in" : "Syllabus-aligned sub-themes · Notes sync when signed in"}</p>
  `;

  const groups = [];
  if (isMath) {
    for (const section of paper.sections || ["A", "B"]) {
      groups.push({
        label: `Section ${section}`,
        themes: themes.filter((t) => t.section === section).sort((a, b) => (a.order || 0) - (b.order || 0)),
      });
    }
  } else {
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
  }

  els.themeGrid.innerHTML = groups
    .map((group) => {
      const heading = group.label
        ? `<h3 class="theme-group-title">${escapeHtml(group.label)}</h3>`
        : "";
      const cards = group.themes
        .map((t) => {
          const count = countQuestionsForTheme(state.paper, t.id);
          const hasNotes = themeHasNotes(t.id, state.paper);
          const sectionMeta = t.section ? ` · Sec ${t.section}` : "";
          return `
            <button type="button" class="theme-card" data-theme-id="${escapeAttr(t.id)}" role="listitem">
              <span class="theme-card-name">${escapeHtml(t.name)}</span>
              <span class="theme-card-meta">${count} PYQ${count === 1 ? "" : "s"}${sectionMeta}${hasNotes ? " · has notes" : ""}</span>
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

  const notes = getThemeNotes(themeId, state.paper);
  const noteFields = getThemeNoteFields(state.paper);
  const isMath = isMathPaper(state.paper);
  const related = paper.questions
    .filter((q) => q.themeId === themeId || q.moduleId === themeId)
    .sort((a, b) => b.year - a.year || String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));

  els.themeDetailMeta.innerHTML = `
    <h2>${escapeHtml(theme.name)}</h2>
    <p>${moduleSectionLabel(theme) ? `${escapeHtml(moduleSectionLabel(theme))} · ` : ""}${escapeHtml(paper.title)} · ${related.length} related PYQ${related.length === 1 ? "" : "s"}</p>
  `;

  els.themeNotesEditor.innerHTML = noteFields.map(
    (f) => `
      <label class="note-field">
        <span class="note-label">${f.label}</span>
        <textarea
          data-theme-id="${escapeAttr(themeId)}"
          data-field="${escapeAttr(f.id)}"
          rows="${f.id === "brainstorm" || f.id === "standardResults" ? 8 : 4}"
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
              ${q.section ? `<span class="badge section-badge">Sec ${escapeHtml(q.section)}</span>` : ""}
              <span class="question-num">Q.${q.number}</span>
            </div>
            ${
              isMath
                ? renderMathScanGallery(q)
                : `<p class="question-text">${escapeHtml(q.text)}</p>`
            }
          </article>
        `
        )
        .join("")
    : '<p class="empty-inline">No PYQs tagged to this theme yet.</p>';

  const studyPath = studyPathForTheme(themeId, state.paper);
  const hasStudy = await renderStudyMaterials(studyPath, els.themeStudyMaterials);
  if (!hasStudy) {
    els.themeStudyMaterials.innerHTML =
      '<p class="study-empty">No study images yet — connect GitHub and upload below, or add files in git.</p>';
  }
  els.themeStudyPanel.classList.remove("hidden");
  bindThemeStudyUpload(els.themeStudyPanel, studyPath);
  const studyHint = els.themeStudyPanel.querySelector(".study-materials-hint");
  if (studyHint) {
    studyHint.innerHTML = isMath
      ? `Upload module scans with <strong>Connect GitHub</strong>, or add files under <code>study/modules/${escapeHtml(themeId)}/</code>. See <code>ADDING_IMAGES.md</code>`
      : `Upload theme diagrams with <strong>Connect GitHub</strong>, or add files under <code>study/themes/${escapeHtml(themeId)}/</code>. See <code>ADDING_IMAGES.md</code>`;
  }
  const studySummary = els.themeStudyPanel.querySelector("summary");
  if (studySummary) {
    studySummary.textContent = isMath
      ? "Standard results · derivations · tricks · scans (from repo)"
      : "Study materials — diagrams · tables · flowcharts (from repo)";
  }

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

function populateSectionFilter() {
  if (!els.sectionFilterGroup || !els.sectionFilter) return;
  const isMath = isMathPaper(state.paper);
  els.sectionFilterGroup.classList.toggle("hidden", !isMath);
  if (!isMath) {
    state.section = "all";
    return;
  }

  els.sectionFilter.innerHTML = `
    <option value="all">All sections</option>
    <option value="A">Section A</option>
    <option value="B">Section B</option>
  `;
  els.sectionFilter.value = state.section;
}

function populateThemeFilter() {
  const themes = getThemesForPaper(state.paper);
  const isMath = isMathPaper(state.paper);
  const prev = state.theme;
  els.themeFilter.innerHTML = `<option value="all">All ${isMath ? "modules" : "themes"}</option>`;

  if (isMath) {
    for (const section of papers[state.paper]?.sections || ["A", "B"]) {
      const group = document.createElement("optgroup");
      group.label = `Section ${section}`;
      themes
        .filter((t) => t.section === section)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach((t) => {
          const opt = document.createElement("option");
          opt.value = t.name;
          opt.textContent = t.name;
          group.appendChild(opt);
        });
      els.themeFilter.appendChild(group);
    }
  } else {
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
  }

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
    q.module,
    q.year,
    q.number,
    ...(q.subthemes || []),
    questionNotesHaystack(q.id, q.notes),
  ]
    .join(" ")
    .toLowerCase();
}

function renderMathScanGallery(q) {
  const base = assetUrl(`study/questions/${q.id}`);
  const imgs = q.scanImages || [];
  if (!imgs.length) {
    return `<p class="question-text question-text--caption">${escapeHtml(q.text)}</p>`;
  }
  const figures = imgs
    .map(
      (file, i) => `
      <figure class="study-figure math-pyq-scan">
        <img src="${escapeAttr(`${base}/${file}`)}" alt="Mathematics Paper Q.${q.number} (${q.year}) — scan ${i + 1}" loading="lazy" decoding="async">
      </figure>`
    )
    .join("");
  const pdfLink = q.sourcePdf
    ? `<p class="math-pdf-link"><a href="${escapeHtml(q.sourcePdf)}" target="_blank" rel="noopener noreferrer">Official PDF on upsc.gov.in ↗</a></p>`
    : "";
  return `<div class="math-pyq-scans">${figures}</div>${pdfLink}`;
}

function bindMathScanFallbacks(card, q) {
  card.querySelectorAll(".math-pyq-scan img").forEach((img) => {
    img.addEventListener("error", () => {
      const wrap = img.closest(".math-pyq-scans");
      if (!wrap || wrap.dataset.fallbackApplied) return;
      wrap.dataset.fallbackApplied = "1";
      wrap.innerHTML = `
        <p class="question-text question-text--caption">${escapeHtml(q.text)}</p>
        <p class="scan-load-error">Scan image could not load. ${
          q.sourcePdf
            ? `<a href="${escapeHtml(q.sourcePdf)}" target="_blank" rel="noopener noreferrer">Open official PDF ↗</a>`
            : "Try a hard refresh (Ctrl+Shift+R)."
        }</p>`;
    });
  });
}

function filterQuestions(questions) {
  const term = state.search.trim().toLowerCase();

  return questions.filter((q) => {
    if (state.year !== "all" && String(q.year) !== state.year) return false;
    if (state.theme !== "all" && q.theme !== state.theme && q.module !== state.theme) return false;
    if (state.section !== "all" && q.section !== state.section) return false;

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
  const isMath = isMathPaper(state.paper);
  els.paperMeta.innerHTML = `
    <h2>${paper.title}</h2>
    <p>${paper.syllabus}</p>
    <p class="meta-range">${isMath ? "PYQs · Filter by year, section, module, marks" : "Questions · Filter by year, theme, marks · Per-question notes below"}</p>
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
  if (isMathPaper(state.paper)) {
    return renderMathPartNotesEditor(q);
  }

  const fields = getQuestionNoteFields(state.paper);
  return fields.map(
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

function partHasAnyNotes(partNotes) {
  if (!partNotes) return false;
  return MATH_PART_TEXT_FIELDS.some((f) => String(partNotes[f.id] || "").trim());
}

function renderQuestionStudyImagesDetails(q) {
  return `
    <details class="study-materials-details">
      <summary>Diagrams &amp; images</summary>
      <div class="study-materials-body" data-study-path="study/questions/${escapeAttr(q.id)}"></div>
      <div class="study-materials-upload"></div>
    </details>`;
}

function renderMathPartNotesEditor(q) {
  const notes = getQuestionNotes(q.id, q.notes);

  return `
    <div class="math-part-notes">
      ${MATH_PARTS.map((part) => {
        const partNotes = notes.parts?.[part];
        const hasNotes = partHasAnyNotes(partNotes);
        return `
          <details class="math-part-details"${hasNotes ? " open" : ""}>
            <summary>
              Part (${part})
              <span class="math-part-marks">10 marks</span>
              ${hasNotes ? '<span class="math-part-has-notes">has notes</span>' : ""}
            </summary>
            <div class="notes-editor math-part-editor">
              ${MATH_PART_TEXT_FIELDS.map(
                (f) => `
                <label class="note-field">
                  <span class="note-label">${f.label}</span>
                  <textarea
                    data-qid="${escapeAttr(q.id)}"
                    data-part="${part}"
                    data-field="${escapeAttr(f.id)}"
                    rows="2"
                    placeholder="${escapeAttr(f.placeholder)}"
                  ></textarea>
                </label>
              `
              ).join("")}
              <div class="solution-scan-section">
                <span class="note-label">Solution scan</span>
                <p class="solution-scan-desc">
                  Handwritten solution photos live in <strong>git</strong> (same on phone &amp; laptop after push).
                </p>
                <div
                  class="solution-scan-gallery"
                  data-qid="${escapeAttr(q.id)}"
                  data-part="${part}"
                  aria-live="polite"
                ></div>
                <div class="solution-scan-git-help">
                  ${renderGitHubConnectHint()}
                  ${renderGitHubUploadButton("math-solution", { qid: q.id, part })}
                  <details class="solution-scan-cli-fallback">
                    <summary>Or use terminal script</summary>
                    <p class="solution-scan-hint">From your computer:</p>
                    <pre class="solution-scan-cmd"><code>${escapeHtml(solutionScanGitCommand(q.id, part))}</code></pre>
                    <p class="solution-scan-hint">
                      Run again for more pages (auto-names <code>part-${part}-02.jpg</code>, …). See <code>ADDING_IMAGES.md</code>.
                    </p>
                  </details>
                </div>
              </div>
            </div>
          </details>
        `;
      }).join("")}
    </div>
  `;
}

async function mountPartSolutionScans(container, questionId, part) {
  const repoScans = await loadRepoSolutionScans(questionId, part);

  if (!repoScans.length) {
    container.innerHTML =
      '<p class="solution-scan-empty">No solution scan yet — use Upload solution photo above.</p>';
    return;
  }

  container.innerHTML = repoScans
    .map(
      (item) => `
        <figure class="study-figure solution-scan-figure">
          <img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.label)}" loading="lazy">
          <figcaption>${escapeHtml(item.label)} · from git</figcaption>
        </figure>
      `
    )
    .join("");
}

function updateMathPartFilledState(details) {
  if (!details) return;
  const hasText = MATH_PART_TEXT_FIELDS.some((f) => {
    const el = details.querySelector(`textarea[data-field="${f.id}"]`);
    return el?.value.trim();
  });
  const hasGallery = Boolean(details.querySelector(".solution-scan-figure"));
  details.classList.toggle("math-part-details--filled", hasText || hasGallery);
}

function bindQuestionNoteEditors(card, q) {
  if (isMathPaper(state.paper)) {
    bindMathPartNoteEditors(card, q);
    return;
  }

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

function bindMathPartNoteEditors(card, q) {
  const notes = getQuestionNotes(q.id, q.notes);

  card.querySelectorAll("textarea[data-part]").forEach((ta) => {
    const part = ta.dataset.part;
    const field = ta.dataset.field;
    ta.value = notes.parts?.[part]?.[field] || "";
    ta.addEventListener(
      "input",
      debounce(() => {
        saveMathPartNote(ta.dataset.qid, part, field, ta.value);
        updateMathPartFilledState(ta.closest(".math-part-details"));
      }, 400)
    );
  });

  card.querySelectorAll(".solution-scan-gallery").forEach((gallery) => {
    mountPartSolutionScans(gallery, gallery.dataset.qid, gallery.dataset.part).then(() => {
      updateMathPartFilledState(gallery.closest(".math-part-details"));
    });
  });

  bindAllGitHubUploadControls(card);
  card.querySelectorAll('.github-upload-control[data-upload-kind="math-solution"]').forEach((control) => {
    control.addEventListener("github-upload-done", () => {
      const gallery = control.closest(".solution-scan-section")?.querySelector(".solution-scan-gallery");
      if (!gallery) return;
      mountPartSolutionScans(gallery, gallery.dataset.qid, gallery.dataset.part).then(() => {
        updateMathPartFilledState(gallery.closest(".math-part-details"));
      });
    });
  });

  card.querySelectorAll(".math-part-details").forEach((details) => {
    updateMathPartFilledState(details);
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
      ? `<button type="button" class="link-theme" data-theme-id="${escapeAttr(q.themeId || q.moduleId)}">Open ${isMathPaper(state.paper) ? "module" : "theme"} notes →</button>`
      : "";

    const sectionBadge = q.section
      ? `<span class="badge section-badge">Sec ${escapeHtml(q.section)}</span>`
      : "";

    const isMath = isMathPaper(state.paper);
    const bodyHtml = isMath
      ? renderMathScanGallery(q)
      : `<p class="question-text">${escapeHtml(q.text)}</p>`;
    const extraImagesDetails = isMath && !(q.scanImages && q.scanImages.length)
      ? renderQuestionStudyImagesDetails(q)
      : "";
    const gsImagesDetails = !isMath ? renderQuestionStudyImagesDetails(q) : "";

    card.innerHTML = `
      <div class="question-header">
        <span class="badge">${q.year}</span>
        <span class="badge marks">${formatMarks(q.marks)}</span>
        ${sectionBadge}
        <span class="badge theme-badge">${escapeHtml(q.theme || q.module || "—")}</span>
        <span class="question-num">Q.${q.number}</span>
      </div>
      ${bodyHtml}
      ${subHtml}
      ${themeLink}
      <details class="study-details">
        <summary>${
          isMath
            ? "Your notes — parts (a) to (e) · synced"
            : "Your notes for this question (text · synced)"
        }</summary>
        <div class="notes-editor">${renderQuestionNotesEditor(q)}</div>
      </details>
      ${extraImagesDetails}
      ${gsImagesDetails}
      ${isPolityQuestion(q) ? constitutionPanelHtml() : ""}
      ${isMath ? "" : renderBestAnswerSection(q)}
    `;

    const studyDetails = card.querySelector(".study-materials-details");
    if (studyDetails) {
      bindLazyStudyMaterials(studyDetails, `study/questions/${q.id}`);
      bindStudyMaterialsUpload(studyDetails, `study/questions/${q.id}`);
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
    if (isMath && q.scanImages?.length) {
      bindMathScanFallbacks(card, q);
    }
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

  if (isMathPaper(paper.paper)) {
    const byYear = {};
    for (const q of paper.questions) {
      byYear[q.year] = (byYear[q.year] || 0) + 1;
    }
    const thin = Object.entries(byYear)
      .filter(([, n]) => n < 8)
      .map(([y, n]) => `${y}(${n})`);
    const missing = [];
    for (let y = 2013; y <= 2025; y++) {
      if (!byYear[y]) missing.push(y);
    }
    let msg = `${paper.questions.length} questions as official PDF scan cutouts (study/questions/math*).`;
    if (missing.length) msg += ` Not on UPSC site: ${missing.join(", ")}.`;
    if (thin.length) msg += ` Partial years: ${thin.join(", ")}. Re-run: python3 scripts/fetch-math-pyq.py`;
    els.dataNote.textContent = msg;
    return;
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
  state.subject = isMathPaper(paperNum) ? "math" : "gs";
  state.year = "all";
  state.theme = "all";
  state.section = "all";
  state.selectedThemeId = null;

  updateSubjectNav();
  updateViewTabLabels();

  document.querySelectorAll(".paper-tab").forEach((tab) => {
    tab.classList.toggle("active", Number(tab.dataset.paper) === paperNum);
  });

  populateYearFilter();
  populateThemeFilter();
  populateSectionFilter();
  await refreshView();
}

function updateSubjectNav() {
  els.subjectTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.subject === state.subject);
  });
  els.paperNavGs?.classList.toggle("hidden", state.subject !== "gs");
  els.paperNavMath?.classList.toggle("hidden", state.subject !== "math");
}

function updateViewTabLabels() {
  if (els.viewTabThemes) {
    els.viewTabThemes.textContent = isMathPaper(state.paper) ? "Modules" : "Themes";
  }
  const themeFilterLabel = document.querySelector('label[for="themeFilter"] span, label[for="themeFilter"]');
  if (themeFilterLabel) {
    themeFilterLabel.textContent = isMathPaper(state.paper) ? "Module" : "Theme";
  }
}

async function setActiveSubject(subject) {
  state.subject = subject;
  if (subject === "math") {
    setViewMode("questions");
    await setActivePaper(5);
  } else {
    await setActivePaper(1);
  }
}

function clearAllFilters() {
  state.search = "";
  state.year = "all";
  state.marks = "all";
  state.theme = "all";
  state.section = "all";
  els.searchInput.value = "";
  els.yearFilter.value = "all";
  els.marksFilter.value = "all";
  els.themeFilter.value = "all";
  if (els.sectionFilter) els.sectionFilter.value = "all";
  renderQuestionView();
}

function bindEvents() {
  els.subjectTabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveSubject(tab.dataset.subject));
  });

  document.querySelectorAll(".paper-tab").forEach((tab) => {
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

  els.sectionFilter?.addEventListener("change", (e) => {
    state.section = e.target.value;
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

  bindGitHubHeaderButton(els.githubConnectBtn);
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
  const res = await fetch(assetUrl(url), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

async function loadData() {
  const gsIds = [1, 2, 3, 4];
  const [themeData, mathModules, ...paperResults] = await Promise.all([
    fetchJson("data/themes.json"),
    fetchJson("data/math-modules.json"),
    ...gsIds.map((n) => fetchJson(`data/gs-paper-${n}.json`)),
    fetchJson("data/math-paper-1.json"),
    fetchJson("data/math-paper-2.json"),
  ]);

  themeConfig = { ...themeData, ...mathModules };
  gsIds.forEach((n, i) => {
    papers[n] = paperResults[i];
  });
  papers[5] = paperResults[4];
  papers[6] = paperResults[5];
}

initTheme();
bindEvents();

(async () => {
  try {
    await loadData();
    await initGitHubUploadConfig();
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
