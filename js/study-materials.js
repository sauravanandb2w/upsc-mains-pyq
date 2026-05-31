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

async function tryFetchText(url, noCache = false) {
  try {
    const res = await fetch(url, noCache ? { cache: "no-store" } : undefined);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function tryFetchJson(url) {
  const text = await tryFetchText(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, true);
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

function sanitizeSvg(svg) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

async function renderImageSection(section, basePath) {
  const src = resolveAssetUrl(basePath, section.file);
  if (!section.file) return "";

  const caption = section.caption || section.title || "";
  const alt = section.alt || caption || "Study diagram";
  const captionHtml = caption
    ? `<figcaption>${escapeHtml(caption)}</figcaption>`
    : "";

  if (section.file.toLowerCase().endsWith(".svg")) {
    const svg = await tryFetchText(`${src}?t=${Date.now()}`, true);
    if (!svg?.trim()) return "";
    return `
      <figure class="study-figure study-figure--standalone">
        <div class="study-svg-wrap" role="img" aria-label="${escapeHtml(alt)}">${sanitizeSvg(svg)}</div>
        ${captionHtml}
      </figure>
    `;
  }

  const cacheBust = `?t=${Date.now()}`;
  return `
    <figure class="study-figure study-figure--standalone">
      <img src="${escapeHtml(src)}${cacheBust}" alt="${escapeHtml(alt)}" loading="lazy">
      ${captionHtml}
    </figure>
  `;
}

function wrapSection(title, innerHtml) {
  if (!title) return innerHtml;
  return `<section class="study-section"><h3 class="study-section-title">${escapeHtml(title)}</h3>${innerHtml}</section>`;
}

function normalizeSections(manifest) {
  if (!manifest) return [];

  if (manifest.sections?.length) {
    return manifest.sections;
  }

  if (manifest.images?.length) {
    return manifest.images.map((item) => {
      if (typeof item === "string") {
        return { type: "image", file: item };
      }
      return { type: "image", file: item.file, caption: item.caption, alt: item.alt, title: item.title };
    });
  }

  return [];
}

/**
 * @param {string} basePath e.g. study/themes/constitution-polity
 * @param {HTMLElement} container
 * @returns {Promise<boolean>} true if any content was rendered
 */
export async function renderStudyMaterials(basePath, container) {
  container.innerHTML = '<p class="study-loading">Loading study materials…</p>';

  const manifest = await tryFetchJson(`${basePath}/manifest.json`);
  const sections = normalizeSections(manifest);

  const parts = [];
  const imageParts = [];
  let hasContent = false;

  async function flushImages() {
    if (!imageParts.length) return;
    parts.push(`<div class="study-images-grid">${imageParts.join("")}</div>`);
    imageParts.length = 0;
  }

  for (const section of sections) {
    if (section.type === "markdown") {
      await flushImages();
      const file = section.file || "README.md";
      const md = await tryFetchText(`${basePath}/${file}?t=${Date.now()}`, true);
      if (!md?.trim()) continue;
      hasContent = true;
      const html = await markdownToHtml(md, basePath);
      parts.push(wrapSection(section.title || "", html));
    } else if (section.type === "image") {
      const html = await renderImageSection(section, basePath);
      if (!html) continue;
      hasContent = true;
      imageParts.push(html);
    }
  }

  await flushImages();

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

  detailsEl.addEventListener("toggle", async () => {
    if (!detailsEl.open) return;
    const ok = await renderStudyMaterials(basePath, body);
    if (!ok) {
      body.innerHTML =
        '<p class="study-empty">No images yet. Add PNG/JPG files and list them in <code>manifest.json</code>.</p>';
    }
  });
}

/** Quick check if folder likely has content (manifest or README). */
export async function hasStudyMaterials(basePath) {
  const manifest = await tryFetchJson(`${basePath}/manifest.json`);
  const sections = normalizeSections(manifest);
  if (sections.length) return true;
  const readme = await tryFetchText(`${basePath}/README.md`);
  return Boolean(readme?.trim());
}
