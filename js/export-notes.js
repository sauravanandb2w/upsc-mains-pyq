/**
 * Export synced notes as JSON or Markdown backup.
 */

import {
  isCloudSyncEnabled,
  fetchAllNotesForExport,
  formatQuestionNotesForExport,
  formatThemeNotesForExport,
} from "./notes-store.js";

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export async function exportNotesAsJson() {
  const data = await fetchAllNotesForExport();
  const payload = {
    exportedAt: new Date().toISOString(),
    source: isCloudSyncEnabled() ? "supabase" : "local",
    ...data,
  };
  downloadBlob(`upsc-pyq-notes-${stamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

export async function exportNotesAsMarkdown() {
  const data = await fetchAllNotesForExport();
  const lines = [
    "# UPSC Mains PYQ — notes backup",
    "",
    `Exported: ${new Date().toISOString()}`,
    "",
  ];

  if (data.themes?.length) {
    lines.push("## Theme / module notes", "");
    for (const row of data.themes) {
      lines.push(...formatThemeNotesForExport(row));
      lines.push("");
    }
  }

  if (data.questions?.length) {
    lines.push("## Question notes", "");
    for (const row of data.questions) {
      lines.push(...formatQuestionNotesForExport(row));
      lines.push("");
    }
  }

  downloadBlob(`upsc-pyq-notes-${stamp()}.md`, lines.join("\n"), "text/markdown;charset=utf-8");
}

export function bindExportNotesButtons(jsonBtn, mdBtn) {
  jsonBtn?.addEventListener("click", () => {
    exportNotesAsJson().catch((err) => window.alert(err.message || String(err)));
  });
  mdBtn?.addEventListener("click", () => {
    exportNotesAsMarkdown().catch((err) => window.alert(err.message || String(err)));
  });
}
