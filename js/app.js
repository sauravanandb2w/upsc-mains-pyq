/** @type {Record<number, { title: string; syllabus: string; questions: object[] }>} */
let papers = {};

const state = {
  paper: 1,
  year: "all",
  marks: "all",
  search: "",
};

const els = {
  paperTabs: document.querySelectorAll(".paper-tab"),
  searchInput: document.getElementById("searchInput"),
  yearFilter: document.getElementById("yearFilter"),
  marksFilter: document.getElementById("marksFilter"),
  clearFilters: document.getElementById("clearFilters"),
  paperMeta: document.getElementById("paperMeta"),
  statsBar: document.getElementById("statsBar"),
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

function getYearsForPaper(paperNum) {
  const paper = papers[paperNum];
  if (!paper) return [];
  const years = [...new Set(paper.questions.map((q) => q.year))];
  return years.sort((a, b) => b - a);
}

function populateYearFilter() {
  const years = getYearsForPaper(state.paper);
  els.yearFilter.innerHTML = '<option value="all">All years</option>';
  years.forEach((year) => {
    const opt = document.createElement("option");
    opt.value = String(year);
    opt.textContent = String(year);
    els.yearFilter.appendChild(opt);
  });
  els.yearFilter.value = state.year;
}

function normalizeMarks(marks) {
  if (typeof marks === "string" && marks.toLowerCase().includes("case")) return "case";
  return String(marks);
}

function filterQuestions(questions) {
  const term = state.search.trim().toLowerCase();

  return questions.filter((q) => {
    if (state.year !== "all" && String(q.year) !== state.year) return false;

    const qMarks = normalizeMarks(q.marks);
    if (state.marks !== "all") {
      if (state.marks === "case" && qMarks !== "case") return false;
      if (state.marks !== "case" && qMarks !== state.marks) return false;
    }

    if (!term) return true;

    const haystack = [
      q.text,
      q.number,
      q.year,
      q.marks,
      ...(q.topics || []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

function renderPaperMeta(paper) {
  els.paperMeta.innerHTML = `
    <h2>${paper.title}</h2>
    <p>${paper.syllabus}</p>
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

  els.statsBar.textContent = `Showing ${filtered.length} of ${total} questions · Years: ${yearSpan}`;
}

function formatMarks(marks) {
  if (typeof marks === "string" && marks.toLowerCase().includes("case")) {
    return "Case study";
  }
  return `${marks} marks`;
}

function renderQuestions(questions) {
  els.questionsList.innerHTML = "";

  questions.forEach((q) => {
    const card = document.createElement("article");
    card.className = "question-card";
    card.setAttribute("role", "listitem");

    const topicsHtml =
      q.topics && q.topics.length
        ? `<ul class="question-topics">${q.topics
            .map((t) => `<li>${escapeHtml(t)}</li>`)
            .join("")}</ul>`
        : "";

    card.innerHTML = `
      <div class="question-header">
        <span class="badge">${q.year}</span>
        <span class="badge marks">${formatMarks(q.marks)}</span>
        <span class="question-num">Q.${q.number}</span>
      </div>
      <p class="question-text">${escapeHtml(q.text)}</p>
      ${topicsHtml}
    `;

    els.questionsList.appendChild(card);
  });

  els.emptyState.classList.toggle("hidden", questions.length > 0);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function render() {
  const paper = papers[state.paper];
  if (!paper) return;

  const filtered = filterQuestions(paper.questions);

  filtered.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.number - b.number;
  });

  renderPaperMeta(paper);
  renderStats(filtered, paper.questions.length);
  renderQuestions(filtered);
}

function setActivePaper(paperNum) {
  state.paper = paperNum;
  state.year = "all";

  els.paperTabs.forEach((tab) => {
    tab.classList.toggle("active", Number(tab.dataset.paper) === paperNum);
  });

  populateYearFilter();
  render();
}

function clearAllFilters() {
  state.search = "";
  state.year = "all";
  state.marks = "all";
  els.searchInput.value = "";
  els.yearFilter.value = "all";
  els.marksFilter.value = "all";
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
      '<p class="empty-state">Could not load question data. Serve this folder with a local server (see README).</p>';
  });
