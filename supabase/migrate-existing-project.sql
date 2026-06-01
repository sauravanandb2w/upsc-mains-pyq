-- Run once in Supabase → SQL Editor if notes sync fails with
-- "Could not find the 'bookmarked' column" (or study_status, etc.)
-- Safe to re-run: uses IF NOT EXISTS.

alter table public.question_notes
  add column if not exists best_answer_online text not null default '';

alter table public.question_notes
  add column if not exists study_status text not null default 'not-started';

alter table public.question_notes
  add column if not exists bookmarked boolean not null default false;

alter table public.question_notes
  add column if not exists status_updated_at timestamptz;

alter table public.question_notes
  add column if not exists last_revised_at timestamptz;

-- Per-field draft locks (synced across devices)
alter table public.theme_notes
  add column if not exists locked_fields jsonb not null default '{}'::jsonb;

alter table public.question_notes
  add column if not exists locked_fields jsonb not null default '{}'::jsonb;

-- Math optional: allow papers 5–6 on theme_notes
alter table public.theme_notes drop constraint if exists theme_notes_paper_check;
alter table public.theme_notes
  add constraint theme_notes_paper_check check (paper between 1 and 6);

-- Refresh PostgREST schema cache (Supabase usually picks this up within ~1 min)
notify pgrst, 'reload schema';
