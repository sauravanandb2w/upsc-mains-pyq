/** Copy to config.js — see SUPABASE_SETUP.md and GITHUB_UPLOAD_SETUP.md */
export const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

/** GitHub OAuth App Client ID (public). Secret stays in Supabase Edge Function. */
export const GITHUB_OAUTH_CLIENT_ID = "";
export const GITHUB_REPO_OWNER = "sauravanandb2w";
export const GITHUB_REPO_NAME = "upsc-mains-pyq";
/** Only this GitHub user can upload/delete images (defaults to GITHUB_REPO_OWNER). */
export const GITHUB_UPLOAD_ALLOWED_USER = "sauravanandb2w";
/** public_repo for public repos; use repo if private */
export const GITHUB_OAUTH_SCOPE = "public_repo";
