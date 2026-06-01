/** Last opened questions — local only (laptop continuity). */

const RECENT_KEY = "upsc-pyq-recent-questions-v1";
const MAX_RECENT = 10;

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(list) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

/**
 * @param {{ qid: string, paper: number, year: number, number: string|number, label?: string }} item
 */
export function trackRecentQuestion(item) {
  if (!item?.qid) return;

  const entry = {
    qid: item.qid,
    paper: item.paper,
    year: item.year,
    number: item.number,
    label:
      item.label ||
      `${item.year} · Q.${item.number}${item.theme ? ` · ${item.theme}` : ""}`,
    openedAt: new Date().toISOString(),
  };

  const list = loadRecent().filter((r) => r.qid !== item.qid);
  list.unshift(entry);
  saveRecent(list);
}

export function getRecentQuestions() {
  return loadRecent();
}

export function renderRecentPanelHtml(recent) {
  if (!recent.length) {
    return `<p class="recent-empty">Open a question to see it here.</p>`;
  }

  return `<ul class="recent-list">${recent
    .map(
      (r) => `
      <li>
        <button type="button" class="recent-link" data-qid="${escapeAttr(r.qid)}" data-paper="${r.paper}">
          ${escapeHtml(r.label || r.qid)}
        </button>
      </li>`
    )
    .join("")}</ul>`;
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

export function bindRecentPanel(container, onOpen) {
  if (!container) return;

  container.querySelectorAll(".recent-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      onOpen(Number(btn.dataset.paper), btn.dataset.qid);
    });
  });
}

export function mountRecentPanel(container) {
  if (!container) return;
  const recent = getRecentQuestions();
  container.innerHTML = `
    <section class="recent-panel" aria-label="Recent questions">
      <h3 class="recent-title">Recent</h3>
      ${renderRecentPanelHtml(recent)}
    </section>`;
  return recent;
}
