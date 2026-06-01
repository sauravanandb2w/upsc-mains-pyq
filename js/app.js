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
  syncNotesWithCloud,
  pullNotesFromCloud,
  withSyncTimeout,
  refreshNotesFromCloud,
  pullQuestionNoteFromCloud,
  refreshThemeNoteFromCloud,
  getLastSyncError,
  setLastSyncError,
  installNotesSyncLifecycle,
  scheduleCloudFlushAfterUnlock,
  isNoteFieldLocked,
  lockNoteField,
  unlockNoteField,
  themeFieldLockKey,
  questionFieldLockKey,
  isCloudSyncEnabled,
  themeNotesHaystack,
  questionNotesHaystack,
  QUESTION_STATUSES,
  getQuestionMeta,
  setQuestionStatus,
  toggleQuestionBookmark,
  getReviseTodayItems,
  isDueForRevision,
  isWeakAndStale,
  getThemeProgress,
} from "./notes-store.js";
import { bindExportNotesButtons } from "./export-notes.js";
import { bindAnswerTimers, requestTimerNotificationPermission } from "./answer-timer.js";
import {
  trackRecentQuestion,
  mountRecentPanel,
  bindRecentPanel,
  getRecentQuestions,
} from "./recent-questions.js";
import { renderActivityDashboard } from "./activity-dashboard.js";
import { loadRepoSolutionScans, solutionScanGitCommand } from "./solution-scans.js";
import {
  renderGitHubUploadButton,
  renderGitHubConnectHint,
  bindGitHubHeaderButton,
  bindStudyMaterialsUpload,
  bindThemeStudyUpload,
  bindAllGitHubUploadControls,
  bindSolutionScanDeletes,
} from "./github-upload-ui.js";
import { initGitHubUploadConfig, initGitHubUploadAccess } from "./github-auth.js";

/** @type {(() => Promise<void>) | null} */
let refreshGitHubHeader = null;

/** @type {Record<number, { title: string; syllabus: string; themes?: string[]; questions: object[] }>} */
let papers = {};
/** @type {Record<string, { label: string; themes: { id: string; name: string }[] }>} */
let themeConfig = {};

const state = {
  subject: "gs",
  paper: 1,
  viewMode: "themes",
  selectedThemeId: null,
  paperYear: null,
  year: "all",
  marks: "all",
  theme: "all",
  section: "all",
  search: "",
  searchNotes: true,
  statusFilter: "all",
  bookmarkFilter: "all",
  reviseFilter: "all",
  authTab: "signin",
};

/** @type {import('@supabase/supabase-js').User | null} */
let currentUser = null;

const els = {
  syncBadge: document.getElementById("syncBadge"),
  syncNotesBtn: document.getElementById("syncNotesBtn"),
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
  statusFilter: document.getElementById("statusFilter"),
  bookmarkFilter: document.getElementById("bookmarkFilter"),
  reviseFilter: document.getElementById("reviseFilter"),
  reviseTodayPanel: document.getElementById("reviseTodayPanel"),
  reviseTodayList: document.getElementById("reviseTodayList"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  exportMdBtn: document.getElementById("exportMdBtn"),
  viewTabThemes: document.querySelector('.view-tab[data-view="themes"]'),
  githubConnectBtn: document.getElementById("githubConnectBtn"),
  recentPanelHost: document.getElementById("recentPanelHost"),
  paperView: document.getElementById("paperView"),
  paperYearSelect: document.getElementById("paperYearSelect"),
  paperMetaPaper: document.getElementById("paperMetaPaper"),
  paperStatsBar: document.getElementById("paperStatsBar"),
  paperQuestionsList: document.getElementById("paperQuestionsList"),
  paperEmptyState: document.getElementById("paperEmptyState"),
  recentPanelHostPaper: document.getElementById("recentPanelHostPaper"),
  progressView: document.getElementById("progressView"),
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

function renderNoteLabelRow(label, lockKey) {
  const locked = isNoteFieldLocked(lockKey);
  return `
    <div class="note-label-row">
      <span class="note-label">${escapeHtml(label)}</span>
      <button
        type="button"
        class="note-lock-btn${locked ? " note-lock-btn--locked" : ""}"
        data-lock-key="${escapeAttr(lockKey)}"
        aria-pressed="${locked ? "true" : "false"}"
        title="${locked ? "Locked on all devices. Click Unlock to sync." : "Lock — draft on all devices until you unlock"}"
      >${locked ? "Unlock" : "Lock"}</button>
    </div>
    ${locked ? '<span class="note-lock-hint">Locked on all devices — unlock here to sync</span>' : ""}
  `;
}

function syncNoteFieldLockUi(btn) {
  const field = btn.closest(".note-field");
  const lockKey = btn.dataset.lockKey;
  const locked = isNoteFieldLocked(lockKey);
  btn.classList.toggle("note-lock-btn--locked", locked);
  btn.setAttribute("aria-pressed", locked ? "true" : "false");
  btn.textContent = locked ? "Unlock" : "Lock";
  btn.title = locked
    ? "Locked on all devices. Click Unlock to sync."
    : "Lock — draft on all devices until you unlock";
  field?.classList.toggle("note-field--locked", locked);
  const existingHint = field?.querySelector(".note-lock-hint");
  if (locked && !existingHint) {
    const hint = document.createElement("span");
    hint.className = "note-lock-hint";
    hint.textContent = "Locked on all devices — unlock here to sync";
    field?.querySelector(".note-label-row")?.insertAdjacentElement("afterend", hint);
  } else if (!locked) {
    existingHint?.remove();
  }
}

function refreshNoteFieldLockButtons(container) {
  container.querySelectorAll(".note-lock-btn").forEach((btn) => syncNoteFieldLockUi(btn));
}

function bindNoteFieldLocks(container, onUnlock) {
  container.querySelectorAll(".note-lock-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lockKey = btn.dataset.lockKey;
      const ta = btn.closest(".note-field")?.querySelector("textarea");
      if (isNoteFieldLocked(lockKey)) {
        unlockNoteField(lockKey);
        onUnlock?.(lockKey);
      } else {
        lockNoteField(lockKey, ta?.value ?? "");
      }
      syncNoteFieldLockUi(btn);
      updateSyncBadge();
    });
    syncNoteFieldLockUi(btn);
  });
}

function updateSyncBadge() {
  const status = getSyncStatus();
  const syncErr = getLastSyncError();
  els.syncNotesBtn?.classList.toggle("hidden", !(status === "cloud" && currentUser));
  if (status === "cloud" && currentUser) {
    if (syncErr) {
      els.syncBadge.textContent = "Sync issue";
      els.syncBadge.className = "sync-badge sync-badge--warn";
      els.syncBadge.title = syncErr;
      els.themeSaveHint.textContent =
        "Cloud sync failed — notes still save in this browser. Check console or try signing out and in.";
    } else {
      els.syncBadge.textContent = "Cloud sync on";
      els.syncBadge.className = "sync-badge sync-badge--cloud";
      els.syncBadge.title = "Notes upload to Supabase when signed in";
      els.themeSaveHint.textContent = "Notes save here and sync to your account (other browsers after sign-in).";
    }
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
    try {
      await withSyncTimeout(pullNotesFromCloud(), 20000);
    } catch (err) {
      setLastSyncError(err?.message || String(err));
      console.error("Notes pull on sign-in failed:", err);
    }
  } else {
    clearNotesStore();
  }

  renderAuthArea();
  updateSyncBadge();
  await refreshView();
}

async function refreshView() {
  els.themeView.classList.toggle("hidden", state.viewMode !== "themes");
  els.questionView.classList.toggle("hidden", state.viewMode !== "questions");
  els.paperView?.classList.toggle("hidden", state.viewMode !== "paper");
  els.progressView?.classList.toggle("hidden", state.viewMode !== "progress");

  if (state.viewMode === "themes") {
    await renderThemeView();
  } else if (state.viewMode === "paper") {
    await renderFullPaperView();
  } else if (state.viewMode === "progress") {
    renderActivityDashboard(els.progressView);
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

function getInsightsSections(paperNum) {
  return themeConfig[String(paperNum)]?.insightsSections || [];
}

function countQuestionsForInsightsSection(paperNum, sectionName) {
  const paper = papers[paperNum];
  if (!paper) return 0;
  return paper.questions.filter((q) => q.insightsSection === sectionName).length;
}

function usesInsightsSections(paperNum = state.paper) {
  return getInsightsSections(paperNum).length > 0;
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
    await loadQuestionNotesForIds(paper.questions.map((q) => q.id));
    renderThemeGrid(paper);
  }
}

function renderThemeGrid(paper) {
  const themes = getThemesForPaper(state.paper);
  const isMath = isMathPaper(state.paper);
  const isInsights = usesInsightsSections(state.paper);
  const insightsSections = isInsights ? getInsightsSections(state.paper) : [];

  els.themePaperMeta.innerHTML = `
    <h2>${escapeHtml(paper.title)} — ${isMath ? "Modules" : isInsights ? "Sections" : "Themes"}</h2>
    <p>${escapeHtml(paper.syllabus)}</p>
    <p class="meta-range">${
      isMath
        ? "Section A & B · Notebook scans in study/modules/ · Notes sync when signed in"
        : isInsights
          ? "Subject-wise PYQs (Insights on India index) · Filter by section in Questions view"
          : "Syllabus-aligned sub-themes · Notes sync when signed in"
    }</p>
  `;

  const groups = [];
  if (isMath) {
    for (const section of paper.sections || ["A", "B"]) {
      groups.push({
        label: `Section ${section}`,
        themes: themes.filter((t) => t.section === section).sort((a, b) => (a.order || 0) - (b.order || 0)),
      });
    }
  } else if (isInsights && insightsSections.length) {
    if (state.paper === 4) {
      const theory = insightsSections.filter((s) => !String(s.name).startsWith("Case Study:"));
      const cases = insightsSections.filter((s) => String(s.name).startsWith("Case Study:"));
      if (theory.length) groups.push({ label: "Theory", themes: theory, insightsSection: true });
      if (cases.length) groups.push({ label: "Case studies", themes: cases, insightsSection: true });
    } else {
      const seenParents = new Set();
      for (const s of insightsSections) {
        const parent = s.parent || "Other";
        if (!seenParents.has(parent)) {
          seenParents.add(parent);
          groups.push({
            label: parent,
            themes: insightsSections.filter((x) => (x.parent || "Other") === parent),
            insightsSection: true,
          });
        }
      }
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
          const isSection = Boolean(group.insightsSection);
          const count = isSection
            ? countQuestionsForInsightsSection(state.paper, t.name)
            : countQuestionsForTheme(state.paper, t.id);
          const hasNotes = isSection ? false : themeHasNotes(t.id, state.paper);
          const progress = isSection
            ? { total: count, attempted: 0, weak: 0 }
            : getThemeProgress(paper.questions, t.id);
          if (isSection && count > 0) {
            const qs = paper.questions.filter((q) => q.insightsSection === t.name);
            progress.attempted = qs.filter((q) => getQuestionMeta(q.id).status !== "not-started").length;
            progress.weak = qs.filter((q) => getQuestionMeta(q.id).status === "weak").length;
            progress.total = count;
          }
          const progressMeta =
            progress.total > 0
              ? ` · ${progress.attempted}/${progress.total} attempted${progress.weak ? ` · ${progress.weak} weak` : ""}`
              : "";
          const sectionMeta = t.section ? ` · Sec ${t.section}` : "";
          const name = t.displayName || t.name;
          const dataAttrs = isSection
            ? `data-insights-section="${escapeAttr(t.name)}"`
            : `data-theme-id="${escapeAttr(t.id)}"`;
          return `
            <button type="button" class="theme-card" ${dataAttrs} role="listitem">
              <span class="theme-card-name">${escapeHtml(name)}</span>
              <span class="theme-card-meta">${count} PYQ${count === 1 ? "" : "s"}${sectionMeta}${progressMeta}${hasNotes ? " · has notes" : ""}</span>
            </button>
          `;
        })
        .join("");
      return `${heading}<div class="theme-group-grid">${cards}</div>`;
    })
    .join("");

  els.themeGrid.querySelectorAll(".theme-card").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.dataset.insightsSection) {
        state.theme = btn.dataset.insightsSection;
        if (els.themeFilter) els.themeFilter.value = state.theme;
        setViewMode("questions");
        await renderQuestionView();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
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

  if (isCloudSyncEnabled()) {
    try {
      await refreshThemeNoteFromCloud(themeId, state.paper);
    } catch (err) {
      console.error("Theme notes pull failed:", themeId, err);
    }
  }

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

  els.themeNotesEditor.innerHTML = noteFields
    .map((f) => {
      const lockKey = themeFieldLockKey(state.paper, themeId, f.id);
      return `
      <label class="note-field${isNoteFieldLocked(lockKey) ? " note-field--locked" : ""}">
        ${renderNoteLabelRow(f.label, lockKey)}
        <textarea
          data-theme-id="${escapeAttr(themeId)}"
          data-field="${escapeAttr(f.id)}"
          rows="${f.id === "brainstorm" || f.id === "standardResults" ? 8 : 4}"
          placeholder="${escapeAttr(f.placeholder)}"
        >${escapeHtml(notes[f.id] || "")}</textarea>
      </label>
    `;
    })
    .join("");

  els.themeNotesEditor.querySelectorAll("textarea").forEach((ta) => {
    ta.addEventListener("input", () => {
      saveThemeNote(ta.dataset.themeId, state.paper, ta.dataset.field, ta.value);
      updateSyncBadge();
    });
  });

  bindNoteFieldLocks(els.themeNotesEditor, () => {
    scheduleCloudFlushAfterUnlock("theme", { themeId, paper: state.paper });
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

function getDefaultPaperYear(paper) {
  const years = getYearsForPaper(state.paper);
  return years.length ? String(years[0]) : "2024";
}

function populatePaperYearSelect() {
  if (!els.paperYearSelect) return;

  const years = getYearsForPaper(state.paper);
  els.paperYearSelect.innerHTML = "";
  for (const y of years) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    els.paperYearSelect.appendChild(opt);
  }

  if (!state.paperYear || !years.includes(Number(state.paperYear))) {
    state.paperYear = getDefaultPaperYear(papers[state.paper]);
  }
  els.paperYearSelect.value = state.paperYear;
}

function recordQuestionOpened(q) {
  if (!q?.id) return;
  trackRecentQuestion({
    qid: q.id,
    paper: state.paper,
    year: q.year,
    number: q.number,
    theme: q.theme || q.module,
    label: isMathPaper(state.paper)
      ? `${q.year} · Q.${q.number} · ${q.module || q.theme || "Math"}`
      : `${q.year} · Q.${q.number} · ${q.theme || "GS"}`,
  });
  refreshRecentPanels();
}

function refreshRecentPanels() {
  const recent = getRecentQuestions();
  for (const host of [els.recentPanelHost, els.recentPanelHostPaper]) {
    if (!host) continue;
    if (!recent.length) {
      host.innerHTML = "";
      continue;
    }
    mountRecentPanel(host);
    bindRecentPanel(host, openRecentQuestion);
  }
}

async function openRecentQuestion(paperNum, qid) {
  if (state.paper !== paperNum) {
    await setActivePaper(paperNum);
  }

  const q = papers[paperNum]?.questions.find((x) => x.id === qid);
  if (!q) return;

  setViewMode("questions");
  state.year = String(q.year);
  if (els.yearFilter) els.yearFilter.value = state.year;
  await renderQuestionView();

  const card = document.querySelector(`.question-card[data-qid="${qid}"]`);
  card?.scrollIntoView({ behavior: "smooth", block: "start" });
  card?.classList.add("question-card--highlight");
  setTimeout(() => card?.classList.remove("question-card--highlight"), 2000);
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
  const label = isMath ? "modules" : usesInsightsSections(state.paper) ? "sections" : "themes";
  els.themeFilter.innerHTML = `<option value="all">All ${label}</option>`;

  if (usesInsightsSections(state.paper)) {
    const sections = getInsightsSections(state.paper);
    if (state.paper === 4) {
      const theory = sections.filter((s) => !String(s.name).startsWith("Case Study:"));
      const cases = sections.filter((s) => String(s.name).startsWith("Case Study:"));
      for (const group of [
        { label: "Theory", items: theory },
        { label: "Case studies", items: cases },
      ]) {
        if (!group.items.length) continue;
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label;
        group.items.forEach((s) => {
          const opt = document.createElement("option");
          opt.value = s.name;
          opt.textContent = s.displayName || s.name;
          optgroup.appendChild(opt);
        });
        els.themeFilter.appendChild(optgroup);
      }
    } else {
      const seenParents = new Set();
      for (const s of sections) {
        const parent = s.parent || "Other";
        if (seenParents.has(parent)) continue;
        seenParents.add(parent);
        const optgroup = document.createElement("optgroup");
        optgroup.label = parent;
        sections
          .filter((x) => (x.parent || "Other") === parent)
          .forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s.name;
            opt.textContent = s.displayName || s.name;
            optgroup.appendChild(opt);
          });
        els.themeFilter.appendChild(optgroup);
      }
    }
    const names = sections.map((s) => s.name);
    if (prev !== "all" && names.includes(prev)) {
      els.themeFilter.value = prev;
    } else {
      state.theme = "all";
      els.themeFilter.value = "all";
    }
    return;
  }

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
    if (state.theme !== "all") {
      if (usesInsightsSections(state.paper) && q.insightsSection) {
        if (q.insightsSection !== state.theme) return false;
      } else if (q.theme !== state.theme && q.module !== state.theme) {
        return false;
      }
    }
    if (state.section !== "all" && q.section !== state.section) return false;

    const qMarks = normalizeMarks(q.marks);
    if (state.marks !== "all") {
      if (state.marks === "case" && qMarks !== "case") return false;
      if (state.marks !== "case" && qMarks !== state.marks) return false;
    }

    const meta = getQuestionMeta(q.id);
    if (state.statusFilter !== "all" && meta.status !== state.statusFilter) return false;
    if (state.bookmarkFilter === "bookmarked" && !meta.bookmarked) return false;
    if (state.reviseFilter === "due" && !isDueForRevision(meta)) return false;
    if (state.reviseFilter === "weak-stale" && !isWeakAndStale(meta)) return false;

    if (!term) return true;
    return questionHaystack(q).includes(term);
  });
}

function renderReviseTodayPanel(questions) {
  if (!els.reviseTodayPanel || !els.reviseTodayList) return;

  const items = getReviseTodayItems(questions, 5);
  if (!items.length) {
    els.reviseTodayPanel.classList.add("hidden");
    return;
  }

  els.reviseTodayPanel.classList.remove("hidden");
  els.reviseTodayList.innerHTML = items
    .map((q) => {
      const meta = getQuestionMeta(q.id);
      const label = isMathPaper(state.paper)
        ? `${q.year} · Q.${q.number} · ${q.module || q.theme}`
        : `${q.year} · Q.${q.number} · ${q.theme}`;
      const tag = meta.bookmarked ? "★" : meta.status === "weak" ? "weak" : "due";
      return `
        <li>
          <button type="button" class="revise-today-link" data-qid="${escapeAttr(q.id)}">
            <span class="revise-today-tag">${escapeHtml(tag)}</span>
            ${escapeHtml(label)}
          </button>
        </li>`;
    })
    .join("");

  els.reviseTodayList.querySelectorAll(".revise-today-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = papers[state.paper]?.questions.find((x) => x.id === btn.dataset.qid);
      if (q) recordQuestionOpened(q);
      const card = document.querySelector(`.question-card[data-qid="${btn.dataset.qid}"]`);
      card?.scrollIntoView({ behavior: "smooth", block: "start" });
      card?.classList.add("question-card--highlight");
      setTimeout(() => card?.classList.remove("question-card--highlight"), 2000);
    });
  });
}

function renderQuestionStudyToolbar(q) {
  const meta = getQuestionMeta(q.id);
  const statusOptions = QUESTION_STATUSES.map(
    (s) =>
      `<option value="${escapeAttr(s.id)}"${meta.status === s.id ? " selected" : ""}>${escapeHtml(s.label)}</option>`
  ).join("");

  const timerHtml = isMathPaper(state.paper)
    ? ""
    : `
    <div class="answer-timer" data-qid="${escapeAttr(q.id)}">
      <span class="answer-timer-label">Timer</span>
      <button type="button" class="btn-ghost btn-sm" data-mins="7">7m</button>
      <button type="button" class="btn-ghost btn-sm" data-mins="10">10m</button>
      <button type="button" class="btn-ghost btn-sm" data-mins="15">15m</button>
      <span class="answer-timer-display hidden" aria-live="polite"></span>
      <button type="button" class="answer-timer-stop btn-ghost btn-sm hidden">Stop</button>
    </div>`;

  return `
    <div class="question-study-toolbar">
      <label class="question-status-wrap">
        <span class="visually-hidden">Status</span>
        <select class="question-status-select" data-qid="${escapeAttr(q.id)}" aria-label="Question status">
          ${statusOptions}
        </select>
      </label>
      <button
        type="button"
        class="question-bookmark-btn${meta.bookmarked ? " question-bookmark-btn--on" : ""}"
        data-qid="${escapeAttr(q.id)}"
        aria-label="${meta.bookmarked ? "Remove star" : "Star for revision"}"
        title="${meta.bookmarked ? "Starred" : "Star for revision"}"
      >${meta.bookmarked ? "★" : "☆"}</button>
      ${timerHtml}
    </div>`;
}

function bindQuestionStudyToolbar(card, q) {
  card.querySelectorAll(".question-status-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      setQuestionStatus(sel.dataset.qid, sel.value);
      if (q) recordQuestionOpened(q);
      const paper = papers[state.paper];
      if (paper) renderReviseTodayPanel(paper.questions);
    });
  });

  card.querySelectorAll(".question-bookmark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = toggleQuestionBookmark(btn.dataset.qid);
      btn.classList.toggle("question-bookmark-btn--on", next);
      btn.textContent = next ? "★" : "☆";
      btn.title = next ? "Starred" : "Star for revision";
      btn.setAttribute("aria-label", next ? "Remove star" : "Star for revision");
      if (q) recordQuestionOpened(q);
      const paper = papers[state.paper];
      if (paper) renderReviseTodayPanel(paper.questions);
    });
  });

  const notesDetails = card.querySelector(".study-details");
  if (notesDetails && q) {
    notesDetails.addEventListener("toggle", () => {
      if (notesDetails.open) recordQuestionOpened(q);
    });
  }

  bindAnswerTimers(card);
}

function renderPaperMeta(paper) {
  const isMath = isMathPaper(state.paper);
  els.paperMeta.innerHTML = `
    <h2>${paper.title}</h2>
    <p>${paper.syllabus}</p>
    <p class="meta-range">${isMath ? "PYQs · Filter by year, section, module, marks" : "Questions · Filter by year, theme, marks · Per-question notes below"}</p>
  `;
}

function renderStats(filtered, total, barEl = els.statsBar) {
  if (!barEl) return;

  const years = [...new Set(filtered.map((q) => q.year))].sort((a, b) => b - a);
  const yearSpan =
    years.length > 0
      ? years.length === 1
        ? years[0]
        : `${years[years.length - 1]}–${years[0]}`
      : "—";
  const isMath = isMathPaper(state.paper);
  const themeLabel = isMath ? "Modules" : "Themes";
  const themes = new Set(filtered.map((q) => q.theme || q.module)).size;

  barEl.textContent = `Showing ${filtered.length} of ${total} · Years: ${yearSpan} · ${themeLabel} in view: ${themes}`;
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
  return fields
    .map((f) => {
      const lockKey = questionFieldLockKey(q.id, f.id);
      return `
      <label class="note-field${isNoteFieldLocked(lockKey) ? " note-field--locked" : ""}">
        ${renderNoteLabelRow(f.label, lockKey)}
        <textarea
          data-qid="${escapeAttr(q.id)}"
          data-field="${escapeAttr(f.id)}"
          rows="3"
          placeholder="${escapeAttr(f.placeholder)}"
        ></textarea>
      </label>
    `;
    })
    .join("");
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
              ${MATH_PART_TEXT_FIELDS.map((f) => {
                const lockKey = questionFieldLockKey(q.id, f.id, part);
                return `
                <label class="note-field${isNoteFieldLocked(lockKey) ? " note-field--locked" : ""}">
                  ${renderNoteLabelRow(f.label, lockKey)}
                  <textarea
                    data-qid="${escapeAttr(q.id)}"
                    data-part="${part}"
                    data-field="${escapeAttr(f.id)}"
                    rows="2"
                    placeholder="${escapeAttr(f.placeholder)}"
                  ></textarea>
                </label>
              `;
              }).join("")}
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
        <figure class="study-figure solution-scan-figure study-figure--deletable">
          <div class="study-figure-media">
            <img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.label)}" loading="lazy">
            <button type="button" class="github-delete-btn solution-scan-remove hidden" data-delete-kind="math-solution" data-qid="${escapeAttr(questionId)}" data-part="${escapeAttr(part)}" data-study-file="${escapeAttr(item.file)}" aria-label="Delete solution scan" title="Delete from git">×</button>
          </div>
          <figcaption>${escapeHtml(item.label)} · from git</figcaption>
        </figure>
      `
    )
    .join("");

  bindSolutionScanDeletes(container, questionId, part, () => {
    updateMathPartFilledState(container.closest(".math-part-details"));
  });
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
    ta.addEventListener("input", () => {
      saveQuestionNote(ta.dataset.qid, ta.dataset.field, ta.value);
    });
  });

  bindNoteFieldLocks(card, () => {
    scheduleCloudFlushAfterUnlock("question", { questionId: q.id });
  });
}

function refillMathTextareas(card, qid) {
  const notes = getQuestionNotes(qid);
  card.querySelectorAll("textarea[data-part]").forEach((ta) => {
    ta.value = notes.parts?.[ta.dataset.part]?.[ta.dataset.field] || "";
  });
}

function bindMathPartNoteEditors(card, q) {
  const notes = getQuestionNotes(q.id, q.notes);

  card.querySelectorAll("textarea[data-part]").forEach((ta) => {
    const part = ta.dataset.part;
    const field = ta.dataset.field;
    ta.value = notes.parts?.[part]?.[field] || "";
    const save = () => {
      saveMathPartNote(ta.dataset.qid, part, field, ta.value);
      updateMathPartFilledState(ta.closest(".math-part-details"));
    };
    ta.addEventListener("input", save);
    ta.addEventListener("change", save);
    ta.addEventListener("blur", save);
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

  bindNoteFieldLocks(card, () => {
    scheduleCloudFlushAfterUnlock("question", { questionId: q.id });
  });
}

function renderBestAnswerSection(q) {
  const lockKey = questionFieldLockKey(q.id, BEST_ANSWER_FIELD.id);
  return `
    <div class="best-answer-section">
      <label class="note-field best-answer-field${isNoteFieldLocked(lockKey) ? " note-field--locked" : ""}">
        ${renderNoteLabelRow(BEST_ANSWER_FIELD.label, lockKey)}
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

function renderQuestions(questions, listEl = els.questionsList, emptyEl = els.emptyState) {
  if (!listEl) return;
  listEl.innerHTML = "";

  questions.forEach((q) => {
    const card = document.createElement("article");
    card.className = "question-card";
    card.setAttribute("role", "listitem");
    card.dataset.qid = q.id;

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
        <span class="badge theme-badge">${escapeHtml(
          usesInsightsSections(state.paper) && q.insightsSection
            ? q.insightsSection.replace(/^Case Study:\s*/, "")
            : q.theme || q.module || "—"
        )}</span>
        <span class="question-num">Q.${q.number}</span>
      </div>
      ${renderQuestionStudyToolbar(q)}
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
    bindQuestionStudyToolbar(card, q);
    if (isMath && q.scanImages?.length) {
      bindMathScanFallbacks(card, q);
    }

    const noteDetails = card.querySelector(".study-details");
    if (noteDetails) {
      noteDetails.addEventListener("toggle", async () => {
        if (!noteDetails.open || !isCloudSyncEnabled()) return;
        try {
          await pullQuestionNoteFromCloud(q.id);
          if (isMath) {
            refillMathTextareas(card, q.id);
            card.querySelectorAll(".math-part-details").forEach((d) => updateMathPartFilledState(d));
          } else {
            const notes = getQuestionNotes(q.id);
            card.querySelectorAll("textarea[data-qid]").forEach((ta) => {
              ta.value = notes[ta.dataset.field] || "";
            });
          }
          refreshNoteFieldLockButtons(card);
        } catch (err) {
          console.error("Notes pull failed:", q.id, err);
        }
      });
    }

    listEl.appendChild(card);
  });

  emptyEl?.classList.toggle("hidden", questions.length > 0);
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
  const paper = papers[state.paper];
  if (!paper) return;

  await loadQuestionNotesForIds(paper.questions.map((q) => q.id));

  const filtered = filterQuestions(paper.questions);

  filtered.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
  });

  renderPaperMeta(paper);
  renderReviseTodayPanel(paper.questions);
  renderStats(filtered, paper.questions.length);
  updateDataNote(paper);
  renderQuestions(filtered);
  refreshRecentPanels();
}

async function renderFullPaperView() {
  const paper = papers[state.paper];
  if (!paper || !els.paperQuestionsList) return;

  populatePaperYearSelect();
  const year = state.paperYear;

  await loadQuestionNotesForIds(paper.questions.map((q) => q.id));

  const yearQuestions = paper.questions
    .filter((q) => String(q.year) === String(year))
    .sort((a, b) =>
      String(a.number).localeCompare(String(b.number), undefined, { numeric: true })
    );

  els.paperMetaPaper.innerHTML = `
    <h2>${escapeHtml(paper.title)} — ${escapeHtml(year)}</h2>
    <p>${escapeHtml(paper.syllabus)}</p>
    <p class="meta-range">${yearQuestions.length} question${yearQuestions.length === 1 ? "" : "s"} · Q.1–Q.${yearQuestions.length || "—"} order · Status & notes on each card</p>
  `;

  renderStats(yearQuestions, paper.questions.length, els.paperStatsBar);
  renderQuestions(yearQuestions, els.paperQuestionsList, els.paperEmptyState);
  refreshRecentPanels();
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
  state.paperYear = null;

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
    if (isMathPaper(state.paper)) {
      els.viewTabThemes.textContent = "Modules";
    } else if (usesInsightsSections(state.paper)) {
      els.viewTabThemes.textContent = "Sections";
    } else {
      els.viewTabThemes.textContent = "Themes";
    }
  }
  const themeFilterLabel = document.querySelector('label[for="themeFilter"]');
  if (themeFilterLabel) {
    if (isMathPaper(state.paper)) {
      themeFilterLabel.textContent = "Module";
    } else if (usesInsightsSections(state.paper)) {
      themeFilterLabel.textContent = "Section";
    } else {
      themeFilterLabel.textContent = "Theme";
    }
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
  state.statusFilter = "all";
  state.bookmarkFilter = "all";
  state.reviseFilter = "all";
  els.searchInput.value = "";
  els.yearFilter.value = "all";
  els.marksFilter.value = "all";
  els.themeFilter.value = "all";
  if (els.sectionFilter) els.sectionFilter.value = "all";
  if (els.statusFilter) els.statusFilter.value = "all";
  if (els.bookmarkFilter) els.bookmarkFilter.value = "all";
  if (els.reviseFilter) els.reviseFilter.value = "all";
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
      if (tab.dataset.view === "paper" && !state.paperYear) {
        state.paperYear = getDefaultPaperYear(papers[state.paper]);
      }
      await refreshView();
    });
  });

  els.paperYearSelect?.addEventListener("change", async (e) => {
    state.paperYear = e.target.value;
    await renderFullPaperView();
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

  els.statusFilter?.addEventListener("change", (e) => {
    state.statusFilter = e.target.value;
    renderQuestionView();
  });

  els.bookmarkFilter?.addEventListener("change", (e) => {
    state.bookmarkFilter = e.target.value;
    renderQuestionView();
  });

  els.reviseFilter?.addEventListener("change", (e) => {
    state.reviseFilter = e.target.value;
    renderQuestionView();
  });

  bindExportNotesButtons(els.exportJsonBtn, els.exportMdBtn);
  requestTimerNotificationPermission();

  els.clearFilters.addEventListener("click", clearAllFilters);
  els.themeToggle.addEventListener("click", toggleTheme);

  els.authOpenBtn?.addEventListener("click", openAuthDialog);
  els.authCloseBtn.addEventListener("click", closeAuthDialog);
  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.authGoogleBtn.addEventListener("click", handleGoogleSignIn);

  document.querySelectorAll(".auth-tab").forEach((btn) => {
    btn.addEventListener("click", () => setAuthTab(btn.dataset.authTab));
  });

  bindGitHubHeaderButton(els.githubConnectBtn).then((refresh) => {
    refreshGitHubHeader = refresh;
  });

  els.syncNotesBtn?.addEventListener("click", async () => {
    if (!currentUser) return;
    els.syncNotesBtn.disabled = true;
    els.syncNotesBtn.textContent = "Syncing…";
    try {
      await withSyncTimeout(syncNotesWithCloud(), 45000);
      updateSyncBadge();
      await refreshView();
    } catch (err) {
      setLastSyncError(err?.message || String(err));
      console.error("Manual notes sync failed:", err);
      updateSyncBadge();
    } finally {
      els.syncNotesBtn.disabled = false;
      els.syncNotesBtn.textContent = "Sync notes";
    }
  });

  window.addEventListener("upsc-activity-updated", () => {
    if (state.viewMode === "progress") {
      renderActivityDashboard(els.progressView);
    }
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
installNotesSyncLifecycle(async () => {
  updateSyncBadge();
  if (state.viewMode === "themes" && state.selectedThemeId) {
    await renderThemeDetail(state.selectedThemeId);
  } else if (state.viewMode === "questions") {
    await renderQuestionView();
  }
});

(async () => {
  try {
    await loadData();
    await initGitHubUploadConfig();
    await initGitHubUploadAccess();
    await refreshGitHubHeader?.();
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
