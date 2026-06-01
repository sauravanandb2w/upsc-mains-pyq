/**
 * UI helpers: Connect GitHub + upload images to repo from the portal.
 */

import {
  isGitHubConnected,
  isGitHubUploadConfiguredSync,
  startGitHubLogin,
  disconnectGitHub,
  initGitHubUploadConfig,
} from "./github-auth.js";
import {
  uploadMathSolutionScan,
  uploadQuestionStudyImage,
  uploadThemeStudyImage,
} from "./github-upload.js";

export async function isGitHubUploadConfigured() {
  const { isGitHubUploadConfigured: check } = await import("./github-auth.js");
  return check();
}

export function renderGitHubConnectHint() {
  if (!isGitHubUploadConfiguredSync()) {
    return `<p class="github-upload-note">Connect GitHub to upload images from the app — see <code>GITHUB_UPLOAD_SETUP.md</code>.</p>`;
  }
  if (isGitHubConnected()) {
    return `<p class="github-upload-note github-upload-note--ok">GitHub connected — uploads commit to your repo (live in ~1–2 min after deploy).</p>`;
  }
  return `<p class="github-upload-note">Connect GitHub once to upload images from this app.</p>`;
}

export function renderGitHubUploadButton(kind, attrs = {}) {
  const label =
    kind === "math-solution"
      ? "Upload solution photo"
      : kind === "theme"
        ? "Upload study image"
        : "Upload image to git";

  const dataAttrs = Object.entries(attrs)
    .map(([k, v]) => ` data-${k}="${String(v).replace(/"/g, "&quot;")}"`)
    .join("");

  return `
    <div class="github-upload-control"${dataAttrs} data-upload-kind="${kind}">
      <label class="github-upload-label btn-ghost btn-sm">
        <input type="file" accept="image/*" capture="environment" class="github-upload-input" hidden />
        ${label}
      </label>
      <span class="github-upload-status" aria-live="polite"></span>
    </div>
  `;
}

export async function bindGitHubHeaderButton(btn) {
  if (!btn) return;

  async function refresh() {
    const configured = await isGitHubUploadConfigured();
    if (!configured) {
      btn.classList.add("hidden");
      return;
    }
    btn.classList.remove("hidden");
    btn.textContent = isGitHubConnected() ? "GitHub ✓" : "Connect GitHub";
    btn.title = isGitHubConnected()
      ? "Connected for image uploads — click to disconnect"
      : "Sign in with GitHub to upload images to the repo";
  }

  await refresh();

  btn.addEventListener("click", async () => {
    if (isGitHubConnected()) {
      if (window.confirm("Disconnect GitHub upload access on this device?")) {
        disconnectGitHub();
        await refresh();
      }
      return;
    }
    await startGitHubLogin(location.pathname + location.search);
  });

  return refresh;
}

export function bindGitHubUploadControl(root) {
  const control = root.classList?.contains("github-upload-control")
    ? root
    : root.querySelector(".github-upload-control");
  if (!control) return;

  const input = control.querySelector(".github-upload-input");
  const status = control.querySelector(".github-upload-status");
  if (!input) return;

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    if (!(await initGitHubUploadConfig())) {
      status.textContent = "Set up GitHub OAuth — see GITHUB_UPLOAD_SETUP.md";
      return;
    }

    if (!isGitHubConnected()) {
      status.textContent = "Connect GitHub first (header button).";
      await startGitHubLogin(location.pathname + location.search);
      return;
    }

    const kind = control.dataset.uploadKind;
    status.textContent = "Uploading…";

    try {
      if (kind === "math-solution") {
        await uploadMathSolutionScan(control.dataset.qid, control.dataset.part, file);
      } else if (kind === "theme") {
        await uploadThemeStudyImage(control.dataset.studyPath, file);
      } else {
        await uploadQuestionStudyImage(control.dataset.qid, file);
      }
      status.textContent = "Uploaded! Live in ~1–2 min after GitHub Pages deploys.";
      control.dispatchEvent(new CustomEvent("github-upload-done", { bubbles: true }));
    } catch (err) {
      status.textContent = err.message || String(err);
    }
  });
}

export function bindStudyMaterialsUpload(detailsEl, basePath, kind = "question") {
  const uploadHost = detailsEl.querySelector(".study-materials-upload");
  if (!uploadHost) return;

  const qid = basePath.replace(/^study\/questions\//, "");
  const attrs =
    kind === "theme" ? { "study-path": basePath } : { qid };

  uploadHost.innerHTML =
    renderGitHubConnectHint() + renderGitHubUploadButton(kind === "theme" ? "theme" : "question", attrs);
  bindGitHubUploadControl(uploadHost);

  uploadHost.addEventListener("github-upload-done", async () => {
    const body = detailsEl.querySelector(".study-materials-body");
    if (!body || !detailsEl.open) return;
    const { renderStudyMaterials } = await import("./study-materials.js");
    const ok = await renderStudyMaterials(basePath, body);
    if (!ok) {
      body.innerHTML =
        '<p class="study-empty">Uploaded to git — visible on the site in ~1–2 min after GitHub Pages deploys.</p>';
    }
  });
}

export function bindThemeStudyUpload(panelEl, studyPath) {
  let host = panelEl.querySelector(".theme-study-upload");
  if (!host) {
    host = document.createElement("div");
    host.className = "theme-study-upload study-materials-upload";
    panelEl.querySelector(".study-materials-body")?.insertAdjacentElement("afterend", host);
    if (!host.parentElement) {
      panelEl.appendChild(host);
    }
  }

  host.innerHTML =
    renderGitHubConnectHint() + renderGitHubUploadButton("theme", { "study-path": studyPath });
  bindGitHubUploadControl(host);

  host.addEventListener("github-upload-done", async () => {
    const body = panelEl.querySelector("#themeStudyMaterials") || panelEl.querySelector(".study-materials-body");
    if (!body) return;
    const { renderStudyMaterials } = await import("./study-materials.js");
    await renderStudyMaterials(studyPath, body);
  });
}

export function bindAllGitHubUploadControls(root = document) {
  root.querySelectorAll(".github-upload-control").forEach((el) => bindGitHubUploadControl(el));
}
