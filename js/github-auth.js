/**
 * GitHub OAuth for uploading study images directly to the repo (Contents API).
 * Token exchange runs via Supabase Edge Function (client secret stays server-side).
 */

import { repoBase } from "./paths.js";

const TOKEN_KEY = "upsc-pyq-github-token";
const RETURN_KEY = "upsc-pyq-github-oauth-return";
const STATE_KEY = "upsc-pyq-github-oauth-state";

let cfg = null;
let configuredCache = null;

async function loadCfg() {
  if (cfg) return cfg;
  try {
    cfg = await import("./config.js");
  } catch {
    cfg = {};
  }
  return cfg;
}

export function inferRepoFromPagesUrl() {
  const host = location.hostname;
  if (host.endsWith(".github.io")) {
    const owner = host.replace(".github.io", "");
    const parts = location.pathname.split("/").filter(Boolean);
    const name = parts[0] || "";
    if (owner && name) return { owner, name };
  }
  return null;
}

export async function getGitHubRepo() {
  const c = await loadCfg();
  const inferred = inferRepoFromPagesUrl();
  return {
    owner: (c.GITHUB_REPO_OWNER || inferred?.owner || "").trim(),
    name: (c.GITHUB_REPO_NAME || inferred?.name || "").trim(),
  };
}


export async function isGitHubUploadConfigured() {
  if (configuredCache !== null) return configuredCache;
  const c = await loadCfg();
  configuredCache = Boolean(
    (c.GITHUB_OAUTH_CLIENT_ID || "").trim() &&
      (c.SUPABASE_URL || "").trim() &&
      (c.SUPABASE_ANON_KEY || "").trim()
  );
  return configuredCache;
}

export function isGitHubUploadConfiguredSync() {
  return configuredCache === true;
}

export async function initGitHubUploadConfig() {
  return isGitHubUploadConfigured();
}

export function getGitHubToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
}

export function isGitHubConnected() {
  return Boolean(getGitHubToken());
}

export function disconnectGitHub() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getOAuthRedirectUri() {
  const base = repoBase();
  return `${location.origin}${base}/oauth/github-callback.html`.replace(/([^:]\/)\/+/g, "$1");
}

export async function startGitHubLogin(returnPath) {
  const c = await loadCfg();
  const clientId = (c.GITHUB_OAUTH_CLIENT_ID || "").trim();
  if (!clientId) {
    throw new Error("GitHub OAuth is not configured (GITHUB_OAUTH_CLIENT_ID). See GITHUB_UPLOAD_SETUP.md");
  }

  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(RETURN_KEY, returnPath || location.pathname + location.search);

  const redirectUri = getOAuthRedirectUri();
  const scope = (c.GITHUB_OAUTH_SCOPE || "public_repo").trim();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  location.href = `https://github.com/login/oauth/authorize?${params}`;
}

export async function completeGitHubLogin(code, state) {
  const expected = sessionStorage.getItem(STATE_KEY);
  if (!expected || expected !== state) {
    throw new Error("OAuth state mismatch — try connecting again.");
  }

  const c = await loadCfg();
  const supabaseUrl = (c.SUPABASE_URL || "").trim();
  const anonKey = (c.SUPABASE_ANON_KEY || "").trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase URL/key required for GitHub token exchange.");
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/github-oauth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      code,
      redirect_uri: getOAuthRedirectUri(),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || data.error_description || "GitHub login failed");
  }

  storeToken(data.access_token);
  sessionStorage.removeItem(STATE_KEY);
  return data.access_token;
}

export function consumeOAuthReturnPath() {
  const path = sessionStorage.getItem(RETURN_KEY) || `${repoBase()}/`.replace(/\/+/g, "/") || "/";
  sessionStorage.removeItem(RETURN_KEY);
  const base = repoBase();
  if (path.startsWith("http")) return path;
  if (base && path.startsWith(base)) return `${location.origin}${path}`;
  if (path.startsWith("/")) return `${location.origin}${path}`;
  return `${location.origin}${base}/${path}`.replace(/\/+/g, "/");
}
