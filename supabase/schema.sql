-- UPSC Mains PYQ — notes schema (run in Supabase SQL Editor)
-- Dashboard → SQL → New query → paste & run

-- Theme-level brainstorm notes (primary workspace)
create table if not exists public.theme_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  theme_id text not null,
  paper smallint not null check (paper between 1 and 6),
  brainstorm text not null default '',
  static_notes text not null default '',
  quotes text not null default '',
  current_affairs text not null default '',
  value_material text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, theme_id)
);

-- Per-question notes (optional, linked to PYQ id e.g. gs2-2024-q5)
-- For math optional (math1-*, math2-*), `quotes` stores JSON: parts (a)–(e) note blobs.
create table if not exists public.question_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  question_id text not null,
  introduction text not null default '',
  static_notes text not null default '',
  quotes text not null default '',
  current_affairs text not null default '',
  topper_points text not null default '',
  value_material text not null default '',
  best_answer_online text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists theme_notes_user_paper_idx
  on public.theme_notes (user_id, paper);

create index if not exists question_notes_user_idx
  on public.question_notes (user_id);

-- Existing project? Run once for math optional module notes (paper 5–6):
-- alter table public.theme_notes drop constraint if exists theme_notes_paper_check;
-- alter table public.theme_notes add constraint theme_notes_paper_check check (paper between 1 and 6);

-- Existing project? Run once if the column is missing:
-- alter table public.question_notes
--   add column if not exists best_answer_online text not null default '';

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists theme_notes_updated_at on public.theme_notes;
create trigger theme_notes_updated_at
  before update on public.theme_notes
  for each row execute function public.set_updated_at();

drop trigger if exists question_notes_updated_at on public.question_notes;
create trigger question_notes_updated_at
  before update on public.question_notes
  for each row execute function public.set_updated_at();

-- Row Level Security: users only see their own notes
alter table public.theme_notes enable row level security;
alter table public.question_notes enable row level security;

drop policy if exists "theme_notes_select_own" on public.theme_notes;
drop policy if exists "theme_notes_insert_own" on public.theme_notes;
drop policy if exists "theme_notes_update_own" on public.theme_notes;
drop policy if exists "theme_notes_delete_own" on public.theme_notes;

create policy "theme_notes_select_own"
  on public.theme_notes for select
  using (auth.uid() = user_id);

create policy "theme_notes_insert_own"
  on public.theme_notes for insert
  with check (auth.uid() = user_id);

create policy "theme_notes_update_own"
  on public.theme_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "theme_notes_delete_own"
  on public.theme_notes for delete
  using (auth.uid() = user_id);

drop policy if exists "question_notes_select_own" on public.question_notes;
drop policy if exists "question_notes_insert_own" on public.question_notes;
drop policy if exists "question_notes_update_own" on public.question_notes;
drop policy if exists "question_notes_delete_own" on public.question_notes;

create policy "question_notes_select_own"
  on public.question_notes for select
  using (auth.uid() = user_id);

create policy "question_notes_insert_own"
  on public.question_notes for insert
  with check (auth.uid() = user_id);

create policy "question_notes_update_own"
  on public.question_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "question_notes_delete_own"
  on public.question_notes for delete
  using (auth.uid() = user_id);
