-- M2: wire external contacts into tasks, appointments, projects.
-- Check constraints enforce that a task/project has at most one kind of assignee/owner.
-- appointment_external_invitees has no mutual-exclusion constraint — mixing user + external invitees is fine.

ALTER TABLE public.tasks
  ADD COLUMN external_assignee_id UUID REFERENCES public.external_contacts(id) ON DELETE SET NULL,
  ADD CONSTRAINT tasks_assignee_xor CHECK (assignee IS NULL OR external_assignee_id IS NULL);

CREATE TABLE public.appointment_external_invitees (
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  external_contact_id UUID NOT NULL REFERENCES public.external_contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (appointment_id, external_contact_id)
);

ALTER TABLE public.appointment_external_invitees ENABLE ROW LEVEL SECURITY;

CREATE POLICY aei_select ON public.appointment_external_invitees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND is_circle_member(a.circle_id))
  );

CREATE POLICY aei_insert ON public.appointment_external_invitees
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND is_circle_member(a.circle_id))
  );

CREATE POLICY aei_delete ON public.appointment_external_invitees
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND is_circle_member(a.circle_id))
  );

ALTER TABLE public.projects
  ADD COLUMN external_owner_id UUID REFERENCES public.external_contacts(id) ON DELETE SET NULL,
  ADD CONSTRAINT projects_owner_xor CHECK (owner IS NULL OR external_owner_id IS NULL);
