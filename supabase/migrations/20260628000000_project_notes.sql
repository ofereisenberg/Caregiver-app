create table project_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  circle_id  uuid not null references care_circle(id) on delete cascade,
  content    text not null,
  created_by uuid not null references user_profile(id),
  created_at timestamptz not null default now()
);

alter table project_notes enable row level security;

create policy "circle members can read project notes"
  on project_notes for select
  using (is_circle_member(circle_id));

create policy "circle members can insert project notes"
  on project_notes for insert
  with check (is_circle_member(circle_id) and auth.uid() = created_by);

create policy "authors can delete own notes"
  on project_notes for delete
  using (auth.uid() = created_by);
