/**
 * Constitution bare act — searchable index + PDF links for GS II Polity.
 */

const INDEX_URL = "data/constitution-index.json";
const PDF_PATH = "study/constitution/constitution-of-india.pdf";

/** @type {{ articles: object[]; pdfPath: string } | null} */
let indexCache = null;

const POLITY_PARENT = "Constitution & Polity";

const POLITY_THEME_IDS = new Set([
  "fundamental-rights-dpsp",
  "parliament-legislature",
  "union-state-executive",
  "judiciary",
  "federalism-centre-state",
  "elections-rpa",
  "constitutional-bodies",
  "constitutional-amendment",
  "special-provisions-ut",
  "comparative-constitution",
]);

export function isPolityTheme(theme) {
  if (!theme) return false;
  return theme.parent === POLITY_PARENT || POLITY_THEME_IDS.has(theme.id);
}

export function isPolityQuestion(q) {
  if (!q) return false;
  return q.themeParent === POLITY_PARENT || POLITY_THEME_IDS.has(q.themeId);
}

export async function loadConstitutionIndex() {
  if (indexCache) return indexCache;
  const res = await fetch(INDEX_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load constitution index");
  indexCache = await res.json();
  return indexCache;
}

function articleSortKey(num) {
  const m = String(num).match(/^(\d+)([A-Z]?)$/);
  if (!m) return [9999, num];
  return [parseInt(m[1], 10), m[2] || ""];
}

/** @param {string} text */
export function extractArticleRefs(text) {
  const refs = new Set();
  const patterns = [
    /\bArticle\s+(\d+[A-Z]?)\b/gi,
    /\bArt\.?\s*(\d+[A-Z]?)\b/gi,
    /\barticles?\s+(\d+[A-Z]?)\b/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const n = m[1].toUpperCase();
      const norm = n.match(/^(\d+)([A-Z]?)$/);
      refs.add(norm ? `${parseInt(norm[1], 10)}${norm[2]}` : n);
    }
  }
  return [...refs].sort((a, b) => {
    const ka = articleSortKey(a);
    const kb = articleSortKey(b);
    return ka[0] - kb[0] || String(ka[1]).localeCompare(String(kb[1]));
  });
}

function normalizeArticleNumber(raw) {
  const s = String(raw).trim().toUpperCase();
  const m = s.match(/^(\d+)([A-Z]?)$/);
  if (!m) return s;
  return `${parseInt(m[1], 10)}${m[2]}`;
}

/** @param {object[]} articles */
function findArticle(articles, num) {
  const key = normalizeArticleNumber(num);
  return articles.find((a) => normalizeArticleNumber(a.number) === key);
}

/** @param {object[]} articles @param {string} query */
function searchArticles(articles, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const numMatch = q.match(/^art\.?\s*(\d+[a-z]?)$/i) || q.match(/^(\d+[a-z]?)$/i);
  if (numMatch) {
    const hit = findArticle(articles, numMatch[1]);
    return hit ? [hit] : [];
  }

  return articles
    .filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.text?.toLowerCase().includes(q) ||
        String(a.number).toLowerCase() === q
    )
    .slice(0, 12);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pdfUrl(page) {
  if (!page) return PDF_PATH;
  return `${PDF_PATH}#page=${page}`;
}

function renderArticleCard(article, { highlight = false } = {}) {
  const page = article.page;
  const hasText = Boolean(article.text?.trim());
  const preview = hasText
    ? escapeHtml(article.text.slice(0, 420)) + (article.text.length > 420 ? "…" : "")
    : '<span class="constitution-no-text">Full text in PDF — open bare act below.</span>';

  return `
    <article class="constitution-article${highlight ? " is-highlight" : ""}" data-article="${escapeHtml(article.number)}">
      <header class="constitution-article-head">
        <h4>Art. ${escapeHtml(article.number)} — ${escapeHtml(article.title)}</h4>
        <a class="btn-link-sm" href="${escapeHtml(pdfUrl(page))}" target="_blank" rel="noopener noreferrer">PDF${page ? ` · p.${page}` : ""}</a>
      </header>
      <p class="constitution-article-text">${preview}</p>
    </article>
  `;
}

/**
 * Mount constitution reference panel into a container.
 * @param {HTMLElement} container
 * @param {{ contextText?: string, relatedTexts?: string[] }} options
 */
export async function mountConstitutionPanel(container, options = {}) {
  const { contextText = "", relatedTexts = [] } = options;

  container.innerHTML = `<p class="constitution-loading">Loading bare act…</p>`;

  try {
    const data = await loadConstitutionIndex();
    const articles = data.articles || [];

    const refTexts = [contextText, ...relatedTexts].filter(Boolean).join(" ");
    const detected = extractArticleRefs(refTexts);
    const detectedArticles = detected
      .map((n) => findArticle(articles, n))
      .filter(Boolean);

    const detectedHtml = detectedArticles.length
      ? `<div class="constitution-detected">
          <p class="constitution-detected-label">Articles in this question / theme</p>
          <div class="constitution-chips">
            ${detected
              .map(
                (n) =>
                  `<button type="button" class="constitution-chip" data-article="${escapeHtml(n)}">Art. ${escapeHtml(n)}</button>`
              )
              .join("")}
          </div>
          <div class="constitution-detected-list">
            ${detectedArticles.map((a) => renderArticleCard(a, { highlight: true })).join("")}
          </div>
        </div>`
      : "";

    container.innerHTML = `
      <div class="constitution-panel-inner">
        <div class="constitution-toolbar">
          <label class="constitution-search-wrap">
            <span class="visually-hidden">Search Constitution</span>
            <input type="search" class="constitution-search" placeholder="Search Art. 21, amendment, secular…" autocomplete="off">
          </label>
          <a class="btn-ghost btn-sm" href="${escapeHtml(PDF_PATH)}" target="_blank" rel="noopener noreferrer">Open full PDF</a>
        </div>
        ${detectedHtml}
        <div class="constitution-results" hidden></div>
        <p class="constitution-meta">${articles.length} articles indexed · bare act as on ${escapeHtml(data.asOn || "2020")}</p>
      </div>
    `;

    const searchInput = container.querySelector(".constitution-search");
    const resultsEl = container.querySelector(".constitution-results");

    const showArticle = (num) => {
      const article = findArticle(articles, num);
      if (!article) {
        resultsEl.hidden = false;
        resultsEl.innerHTML = `<p class="constitution-empty">Article ${escapeHtml(num)} not found in index.</p>`;
        return;
      }
      resultsEl.hidden = false;
      resultsEl.innerHTML = renderArticleCard(article);
      resultsEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    container.querySelectorAll(".constitution-chip").forEach((btn) => {
      btn.addEventListener("click", () => showArticle(btn.dataset.article));
    });

    let searchTimer;
    searchInput?.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const q = searchInput.value.trim();
        if (!q) {
          resultsEl.hidden = true;
          resultsEl.innerHTML = "";
          return;
        }
        const hits = searchArticles(articles, q);
        resultsEl.hidden = false;
        resultsEl.innerHTML = hits.length
          ? hits.map((a) => renderArticleCard(a)).join("")
          : `<p class="constitution-empty">No match for “${escapeHtml(q)}”. Try an Art. number or title keyword.</p>`;
      }, 200);
    });
  } catch (err) {
    container.innerHTML = `<p class="constitution-error">Could not load bare act index. ${escapeHtml(err.message)}</p>`;
  }
}

export function constitutionPanelHtml() {
  return `
    <details class="constitution-panel" open>
      <summary>Constitution bare act — search &amp; cite</summary>
      <p class="constitution-hint">Articles mentioned in the question are auto-detected. Use exact wording when writing answers.</p>
      <div class="constitution-panel-body"></div>
    </details>
  `;
}
