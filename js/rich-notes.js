/**
 * Lightweight rich text for synced note fields (stores sanitized HTML in existing text columns).
 */

const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "br",
  "p",
  "div",
  "ul",
  "ol",
  "li",
]);

export function looksLikeNoteHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value ?? ""));
}

export function noteHtmlToPlainText(html) {
  const s = String(html ?? "");
  if (!s.trim()) return "";
  if (!looksLikeNoteHtml(s)) return s;
  const div = document.createElement("div");
  div.innerHTML = sanitizeNoteHtml(s);
  return (div.textContent || "").replace(/\u00a0/g, " ");
}

export function noteValueHasContent(value) {
  return Boolean(noteHtmlToPlainText(String(value ?? "")).trim());
}

export function sanitizeNoteHtml(dirty) {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(dirty ?? "");
  const out = document.createElement("div");

  function appendClean(parent, node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) parent.appendChild(document.createTextNode(node.textContent));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      node.childNodes.forEach((child) => appendClean(parent, child));
      return;
    }

    const el = document.createElement(tag);
    node.childNodes.forEach((child) => appendClean(el, child));
    if (tag === "br" || el.childNodes.length || tag === "li") {
      parent.appendChild(el);
    }
  }

  tpl.content.childNodes.forEach((child) => appendClean(out, child));
  return out.innerHTML;
}

function escapeTextToHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainTextToNoteHtml(text) {
  const s = String(text ?? "");
  if (!s) return "";
  if (looksLikeNoteHtml(s)) return sanitizeNoteHtml(s);
  return s
    .split(/\n/)
    .map((line) => (line.trim() ? `<p>${escapeTextToHtml(line)}</p>` : "<p><br></p>"))
    .join("");
}

/** Normalize stored note (plain or HTML) for the rich editor. */
export function noteStorageToEditorHtml(raw) {
  const s = String(raw ?? "");
  if (!s.trim()) return "";
  if (looksLikeNoteHtml(s)) return sanitizeNoteHtml(s);
  return plainTextToNoteHtml(s);
}

/** Sanitized HTML for git-backed note files — keeps formatting on round-trip. */
export function noteHtmlForGitStorage(html) {
  const s = String(html ?? "").trim();
  if (!s) return "";
  if (looksLikeNoteHtml(s)) return sanitizeNoteHtml(s);
  return plainTextToNoteHtml(s);
}

export function setRichNoteContent(editor, raw) {
  if (!editor) return;
  const s = String(raw ?? "");
  if (!s.trim()) {
    editor.innerHTML = "";
    return;
  }
  editor.innerHTML = noteStorageToEditorHtml(s);
}

export function getRichNoteContent(editor) {
  if (!editor) return "";
  const html = editor.innerHTML.trim();
  if (!html || html === "<br>") return "";
  const plain = noteHtmlToPlainText(html);
  if (!plain.trim()) return "";
  return sanitizeNoteHtml(html);
}

export function renderRichNoteToolbar() {
  const buttons = [
    { cmd: "bold", label: "B", title: "Bold (Ctrl+B)" },
    { cmd: "italic", label: "I", title: "Italic (Ctrl+I)" },
    { cmd: "underline", label: "U", title: "Underline (Ctrl+U)" },
    { cmd: "strikeThrough", label: "S", title: "Strikethrough" },
    { sep: true },
    { cmd: "insertUnorderedList", label: "•", title: "Bullet list" },
    { cmd: "insertOrderedList", label: "1.", title: "Numbered list" },
    { sep: true },
    { cmd: "removeFormat", label: "⌫", title: "Clear formatting" },
  ];

  return `<div class="rich-note-toolbar" role="toolbar" aria-label="Text formatting">
    ${buttons
      .map((b) =>
        b.sep
          ? `<span class="rich-note-toolbar-sep" aria-hidden="true"></span>`
          : `<button type="button" class="rich-note-tool" data-cmd="${b.cmd}" title="${b.title}" aria-label="${b.title}">${b.label}</button>`
      )
      .join("")}
  </div>`;
}

/** Visible editor height per `rows` hint (flex layout needs explicit height). */
const NOTE_EDITOR_HEIGHT_REM = {
  2: 22,
  3: 26,
  4: 30,
  5: 34,
  6: 38,
  8: 44,
  10: 52,
  12: 56,
};

export const NOTE_EDITOR_SIZE_KEY = "upsc-pyq-note-editor-size";

/** @type {Record<string, { label: string, scale: number, hint: string }>} */
export const NOTE_EDITOR_SIZES = {
  s: { label: "S", scale: 0.4, hint: "Compact note boxes" },
  m: { label: "M", scale: 0.7, hint: "Medium note boxes (default)" },
  l: { label: "L", scale: 1, hint: "Large note boxes" },
};

export function getNoteEditorSize() {
  const stored = localStorage.getItem(NOTE_EDITOR_SIZE_KEY);
  return stored && NOTE_EDITOR_SIZES[stored] ? stored : "m";
}

export function setNoteEditorSize(size) {
  if (!NOTE_EDITOR_SIZES[size]) return getNoteEditorSize();
  localStorage.setItem(NOTE_EDITOR_SIZE_KEY, size);
  document.documentElement.dataset.noteEditorSize = size;
  applyNoteEditorHeightsIn(document);
  return size;
}

export function initNoteEditorSize() {
  const size = getNoteEditorSize();
  document.documentElement.dataset.noteEditorSize = size;
  return size;
}

export function noteEditorHeightRem(rows = 4, size = getNoteEditorSize()) {
  const base = NOTE_EDITOR_HEIGHT_REM[rows] ?? 28;
  const scale = NOTE_EDITOR_SIZES[size]?.scale ?? NOTE_EDITOR_SIZES.m.scale;
  return Math.round(base * scale * 10) / 10;
}

/** Re-apply heights after S/M/L change (no full re-render). */
export function applyNoteEditorHeightsIn(root = document) {
  root.querySelectorAll(".rich-note[data-rows]").forEach((el) => {
    const rows = Number(el.dataset.rows) || 4;
    const rem = noteEditorHeightRem(rows);
    el.style.setProperty("--note-editor-height", `${rem}rem`);
  });
}

/**
 * @param {Record<string, string>} dataAttrs - e.g. { "data-field": "brainstorm" }
 */
export function renderRichNoteEditorHtml(dataAttrs = {}, { placeholder = "", rows = 4 } = {}) {
  const attrs = Object.entries(dataAttrs)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
    .join(" ");
  const heightRem = noteEditorHeightRem(rows);
  return `<div class="rich-note" data-rows="${rows}" style="--note-editor-height: ${heightRem}rem">
    ${renderRichNoteToolbar()}
    <div class="rich-note-scroll">
      <div
        class="rich-note-editor"
        contenteditable="true"
        role="textbox"
        spellcheck="true"
        data-placeholder="${String(placeholder).replace(/"/g, "&quot;")}"
        ${attrs}
      ></div>
    </div>
  </div>`;
}

export function bindRichNoteToolbar(toolbar, editor) {
  if (!toolbar || !editor) return;

  toolbar.querySelectorAll(".rich-note-tool[data-cmd]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      editor.focus();
      const cmd = btn.dataset.cmd;
      if (!cmd) return;
      try {
        document.execCommand(cmd, false, null);
      } catch {
        /* ignore unsupported commands */
      }
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

export function bindRichNoteEditor(editor, { onInput } = {}) {
  if (!editor) return;

  const toolbar = editor.closest(".rich-note")?.querySelector(".rich-note-toolbar");
  bindRichNoteToolbar(toolbar, editor);

  editor.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const map = { b: "bold", i: "italic", u: "underline" };
    const cmd = map[e.key.toLowerCase()];
    if (!cmd) return;
    e.preventDefault();
    try {
      document.execCommand(cmd, false, null);
    } catch {
      /* ignore */
    }
  });

  editor.addEventListener("input", () => onInput?.(getRichNoteContent(editor)));
  editor.addEventListener("blur", () => onInput?.(getRichNoteContent(editor)));
}

export function setRichNoteLocked(editor, locked) {
  if (!editor) return;
  editor.setAttribute("contenteditable", locked ? "false" : "true");
  editor.classList.toggle("rich-note-editor--locked", locked);
  editor.closest(".note-field")?.classList.toggle("note-field--locked", locked);
  const toolbar = editor.closest(".rich-note")?.querySelector(".rich-note-toolbar");
  if (toolbar) {
    toolbar.querySelectorAll("button").forEach((btn) => {
      btn.disabled = locked;
    });
  }
}

export function syncRichNoteLockState(fieldEl, locked) {
  const editor = fieldEl?.querySelector(".rich-note-editor");
  setRichNoteLocked(editor, locked);
}

export function readNoteFieldValue(fieldEl) {
  const editor = fieldEl?.querySelector(".rich-note-editor");
  return getRichNoteContent(editor);
}

export function writeNoteFieldValue(fieldEl, value) {
  const editor = fieldEl?.querySelector(".rich-note-editor");
  setRichNoteContent(editor, value);
}
