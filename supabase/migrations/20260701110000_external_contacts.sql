-- External contacts: assignable people without app accounts.
-- email and linked_user_id are dormant in M1/M2 — scaffolded for elevation flow (M3).

CREATE TABLE public.external_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.care_circle(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  linked_user_id UUID REFERENCES public.user_profile(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.user_profile(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.external_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_contacts_select ON public.external_contacts
  FOR SELECT USING (is_circle_member(circle_id));

CREATE POLICY external_contacts_insert ON public.external_contacts
  FOR INSERT WITH CHECK (is_circle_member(circle_id) AND auth.uid() = created_by);

CREATE POLICY external_contacts_update ON public.external_contacts
  FOR UPDATE USING (is_circle_member(circle_id))
  WITH CHECK (is_circle_member(circle_id));

CREATE POLICY external_contacts_delete ON public.external_contacts
  FOR DELETE USING (created_by = auth.uid() OR is_circle_admin(circle_id));
