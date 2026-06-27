-- Migration: appointment_invitees
-- Run in Supabase Studio → SQL Editor
-- Replaces the single `assignee` column on appointments with a join table
-- that supports multiple invitees per appointment.

-- 1. Create join table
create table appointment_invitees (
  appointment_id uuid not null references appointments(id) on delete cascade,
  user_id        uuid not null references user_profile(id) on delete cascade,
  primary key (appointment_id, user_id)
);

-- 2. Migrate existing single-assignee rows
insert into appointment_invitees (appointment_id, user_id)
select id, assignee
from appointments
where assignee is not null;

-- 3. Enable RLS
alter table appointment_invitees enable row level security;

-- 4. RLS policies — reuse existing helper is_circle_member()
create policy "Circle members can view invitees"
  on appointment_invitees for select
  using (
    exists (
      select 1 from appointments a
      where a.id = appointment_invitees.appointment_id
        and is_circle_member(a.circle_id)
    )
  );

create policy "Circle members can add invitees"
  on appointment_invitees for insert
  with check (
    exists (
      select 1 from appointments a
      where a.id = appointment_invitees.appointment_id
        and is_circle_member(a.circle_id)
    )
  );

create policy "Circle members can remove invitees"
  on appointment_invitees for delete
  using (
    exists (
      select 1 from appointments a
      where a.id = appointment_invitees.appointment_id
        and is_circle_member(a.circle_id)
    )
  );

-- 5. Drop the old single-assignee column
alter table appointments drop column assignee;
