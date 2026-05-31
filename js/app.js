/** @type {Record<number, { title: string; syllabus: string; themes?: string[]; questions: object[] }>} */
let papers = {};

const NOTES_STORAGE_KEY = "upsc-pyq-notes-v1";

const NOTE_FIELDS = [
  { id: "introduction", label: "Introduction", placeholder: "Your intro hook, context, definition…" },
  { id: "staticNotes", label: "Static notes", placeholder: "Core syllabus content, facts, diagrams…" },
  { id: "quotes", label: "Quotes", placeholder: "Thinkers, committees, constitutional quotes…" },
  { id: "currentAffairs", label: "Current affairs", placeholder: "Link recent events (year-specific)…" },
  { id: "topperPoints", label: "Topper points", placeholder: "Structure, presentation, high-scoring angles…" },
  { id: "valueMaterial", label: "Value material", placeholder: "Cases, reports, data, maps, examples…" },
];

const state = {
  paper: 1,
  year: "all",
  marks: "all",
  theme: "all",
  search: "",
};

const els = {
  paperTabs: document.querySelectorAll(".paper-tab"),
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

function loadNotesStore() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveNotesStore(store) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(store));
}

function getQuestionNotes(q) {
  const store = loadNotesStore();
  const fromFile = q.notes || {};
  const fromLocal = store[q.id] || {};
  const merged = { ...fromFile };
  for (const f of NOTE_FIELDS) {
    if (fromLocal[f.id]?.trim()) merged[f.id] = fromLocal[f.id];
  }
  return merged;
}

function saveQuestionNote(questionId, fieldId, value) {
  const store = loadNotesStore();
  if (!store[questionId]) store[questionId] = {};
  store[questionId][fieldId] = value;
  saveNotesStore(store);
}

function getYearsForPaper(paperNum) {
  const paper = papers[paperNum];
  if (!paper) return [];
  return [...new Set(paper.questions.map((q) => q.year))].sort((a, b) => b - a);
}

function getThemesForPaper(paperNum) {
  const paper = papers[paperNum];
  if (!paper) return [];
  if (paper.themes?.length) return paper.themes;
  const set = new Set(paper.questions.map((q) => q.theme).filter(Boolean));
  return [...set].sort();
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
  themes.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    els.themeFilter.appendChild(opt);
  });
  if (prev !== "all" && themes.includes(prev)) {
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
  const notes = getQuestionNotes(q);
  return [
    q.text,
    q.theme,
    ...(q.subthemes || []),
    ...Object.values(notes),
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
    <p class="meta-range">Questions only · Classified by syllabus theme · Add your notes below each question (saved in browser)</p>
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

function renderNotesEditor(q) {
  return NOTE_FIELDS.map(
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

function bindNoteEditors(card, q) {
  const notes = getQuestionNotes(q);
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

    card.innerHTML = `
      <div class="question-header">
        <span class="badge">${q.year}</span>
        <span class="badge marks">${formatMarks(q.marks)}</span>
        <span class="badge theme-badge">${escapeHtml(q.theme || "—")}</span>
        <span class="question-num">Q.${q.number}</span>
      </div>
      <p class="question-text">${escapeHtml(q.text)}</p>
      ${subHtml}
      <details class="study-details" open>
        <summary>Your notes (introduction · static · quotes · CA · topper · value)</summary>
        <div class="notes-editor">${renderNotesEditor(q)}</div>
      </details>
    `;

    bindNoteEditors(card, q);
    els.questionsList.appendChild(card);
  });

  els.emptyState.classList.toggle("hidden", questions.length > 0);
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

function render() {
  const paper = papers[state.paper];
  if (!paper) return;

  const filtered = filterQuestions(paper.questions);

  filtered.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return String(a.number).localeCompare(String(b.number), undefined, {
      numeric: true,
    });
  });

  renderPaperMeta(paper);
  renderStats(filtered, paper.questions.length);
  updateDataNote(paper);
  renderQuestions(filtered);
}

function setActivePaper(paperNum) {
  state.paper = paperNum;
  state.year = "all";
  state.theme = "all";

  els.paperTabs.forEach((tab) => {
    tab.classList.toggle("active", Number(tab.dataset.paper) === paperNum);
  });

  populateYearFilter();
  populateThemeFilter();
  render();
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
  render();
}

function bindEvents() {
  els.paperTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActivePaper(Number(tab.dataset.paper));
    });
  });

  els.searchInput.addEventListener(
    "input",
    debounce((e) => {
      state.search = e.target.value;
      render();
    }, 200)
  );

  els.yearFilter.addEventListener("change", (e) => {
    state.year = e.target.value;
    render();
  });

  els.marksFilter.addEventListener("change", (e) => {
    state.marks = e.target.value;
    render();
  });

  els.themeFilter.addEventListener("change", (e) => {
    state.theme = e.target.value;
    render();
  });

  els.clearFilters.addEventListener("click", clearAllFilters);
  els.themeToggle.addEventListener("click", toggleTheme);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function loadData() {
  const ids = [1, 2, 3, 4];
  const results = await Promise.all(
    ids.map((n) =>
      fetch(`data/gs-paper-${n}.json`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load GS Paper ${n}`);
        return r.json();
      })
    )
  );
  ids.forEach((n, i) => {
    papers[n] = results[i];
  });
}

initTheme();
bindEvents();

loadData()
  .then(() => setActivePaper(1))
  .catch((err) => {
    console.error(err);
    els.questionsList.innerHTML =
      '<p class="empty-state">Could not load questions. Serve with: python3 -m http.server 8080</p>';
  });
