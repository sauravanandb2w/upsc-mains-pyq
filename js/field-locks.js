/**
 * Lock key helpers (locks are stored in Supabase `locked_fields` on each note row).
 */

export function themeFieldLockKey(paper, themeId, fieldId) {
  return `t:${paper}:${themeId}:${fieldId}`;
}

export function questionFieldLockKey(questionId, fieldId, partId = null) {
  return partId ? `q:${questionId}:${partId}:${fieldId}` : `q:${questionId}:${fieldId}`;
}

/** @returns {{ kind: 'theme'|'question', paper?: number, themeId?: string, questionId?: string, partId?: string|null, fieldId: string, storageKey: string } | null} */
export function parseLockKey(lockKey) {
  if (!lockKey || typeof lockKey !== "string") return null;
  const parts = lockKey.split(":");
  if (parts[0] === "t" && parts.length >= 4) {
    return {
      kind: "theme",
      paper: Number(parts[1]),
      themeId: parts.slice(2, -1).join(":"),
      fieldId: parts[parts.length - 1],
      storageKey: parts[parts.length - 1],
    };
  }
  if (parts[0] === "q" && parts.length === 3) {
    return {
      kind: "question",
      questionId: parts[1],
      partId: null,
      fieldId: parts[2],
      storageKey: parts[2],
    };
  }
  if (parts[0] === "q" && parts.length === 4) {
    return {
      kind: "question",
      questionId: parts[1],
      partId: parts[2],
      fieldId: parts[3],
      storageKey: `${parts[2]}:${parts[3]}`,
    };
  }
  return null;
}
