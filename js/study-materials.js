/**
 * Load study materials (markdown, images, mermaid) from the repo under study/.
 * Edit files locally in Cursor → git push → live on GitHub Pages.
 */

let markedLib = null;
let mermaidLib = null;

async function getMarked() {
  if (!markedLib) {
    const mod = await import("https://esm.sh/marked@15.0.6");
    markedLib = mod.marked;
    markedLib.setOptions({ gfm: true, breaks: true });
  }
  return markedLib;
}

async function getMermaid() {
  if (!mermaidLib) {
    const mod = await import("https://esm.sh/mermaid@11.4.0");
    mermaidLib = mod.default;
    mermaidLib.initialize({
      startOnLoad: false,
      theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "default",
      securityLevel: "strict",
    });
  }
  return mermaidLib;
}

async function tryFetchText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function tryFetchJson(url) {
  const text = await tryFetchText(url);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function resolveAssetUrl(basePath, src) {
  if (!src || src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  const clean = src.replace(/^\.\//, "");
  return `${basePath}/${clean}`.replace(/\/+/g, "/");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function markdownToHtml(md, basePath) {
  const marked = await getMarked();
  const renderer = new marked.Renderer();

  renderer.image = ({ href, title, text }) => {
    const src = resolveAssetUrl(basePath, href);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<figure class="study-figure"><img src="${escapeHtml(src)}" alt="${escapeHtml(text || "")}" loading="lazy"${titleAttr}><figcaption>${escapeHtml(text || "")}</figcaption></figure>`;
  };

  renderer.link = ({ href, title, text }) => {
    const external = href.startsWith("http");
    const rel = external ? ' rel="noopener noreferrer"' : "";
    const target = external ? ' target="_blank"' : "";
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${escapeHtml(href)}"${target}${rel}${titleAttr}>${text}</a>`;
  };

  let html = marked.parse(md, { renderer });

  html = html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi,
    (_match, code) => {
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      return `<div class="study-mermaid" data-mermaid-id="${id}">${escapeHtml(decodeHtmlEntities(code.trim()))}</div>`;
    }
  );

  return html;
}

function decodeHtmlEntities(str) {
  const ta = document.createElement("textarea");
  ta.innerHTML = str;
  return ta.value;
}

async function renderMermaidBlocks(root) {
  const blocks = root.querySelectorAll("[data-mermaid-id]");
  if (!blocks.length) return;

  const mermaid = await getMermaid();
  for (const block of blocks) {
    const id = block.dataset.mermaidId;
    const source = block.textContent;
    try {
      const { svg } = await mermaid.render(id, source);
      block.innerHTML = svg;
      block.classList.add("study-mermaid--rendered");
    } catch (err) {
      block.innerHTML = `<pre class="study-mermaid-error">${escapeHtml(String(err.message || err))}</pre>`;
    }
  }
}

function wrapSection(title, innerHtml) {
  if (!title) return innerHtml;
  return `<section class="study-section"><h3 class="study-section-title">${escapeHtml(title)}</h3>${innerHtml}</section>`;
}

/**
 * @param {string} basePath e.g. study/themes/constitution-polity
 * @param {HTMLElement} container
 * @returns {Promise<boolean>} true if any content was rendered
 */
export async function renderStudyMaterials(basePath, container) {
  container.innerHTML = '<p class="study-loading">Loading study materials…</p>';

  const manifest = await tryFetchJson(`${basePath}/manifest.json`);
  const sections =
    manifest?.sections?.length > 0
      ? manifest.sections
      : [{ type: "markdown", file: "README.md" }];

  const parts = [];
  let hasContent = false;

  for (const section of sections) {
    if (section.type === "markdown") {
      const file = section.file || "README.md";
      const md = await tryFetchText(`${basePath}/${file}`);
      if (!md?.trim()) continue;
      hasContent = true;
      const html = await markdownToHtml(md, basePath);
      parts.push(wrapSection(section.title || "", html));
    } else if (section.type === "image") {
      const src = resolveAssetUrl(basePath, section.file);
      if (!section.file) continue;
      hasContent = true;
      const caption = section.caption || section.title || "";
      parts.push(`
        <figure class="study-figure study-figure--standalone">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(section.alt || caption)}" loading="lazy">
          ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
        </figure>
      `);
    }
  }

  if (!hasContent) {
    container.innerHTML = "";
    return false;
  }

  container.innerHTML = `<div class="study-content">${parts.join("")}</div>`;
  await renderMermaidBlocks(container);
  return true;
}

/**
 * Attach lazy-loaded study materials to a <details> element.
 * @param {HTMLDetailsElement} detailsEl
 * @param {string} basePath
 */
export function bindLazyStudyMaterials(detailsEl, basePath) {
  const body = detailsEl.querySelector(".study-materials-body");
  if (!body) return;

  let loaded = false;

  detailsEl.addEventListener("toggle", async () => {
    if (!detailsEl.open || loaded) return;
    loaded = true;
    const ok = await renderStudyMaterials(basePath, body);
    if (!ok) {
      body.innerHTML =
        '<p class="study-empty">No study files yet. Add <code>study/questions/' +
        escapeHtml(basePath.split("/").pop() || "") +
        "/README.md</code> and push to GitHub.</p>";
    }
  });
}

/** Quick check if folder likely has content (manifest or README). */
export async function hasStudyMaterials(basePath) {
  const manifest = await tryFetchJson(`${basePath}/manifest.json`);
  if (manifest?.sections?.length) return true;
  const readme = await tryFetchText(`${basePath}/README.md`);
  return Boolean(readme?.trim());
}
