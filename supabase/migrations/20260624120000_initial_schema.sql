-- Migration: 20260624120000_initial_schema.sql
-- Initial schema: enums, tables, indexes, functions, trigger, RLS, Realtime

-- ============================================================
-- Step 1: Enums
-- ============================================================

CREATE TYPE public.visibility AS ENUM ('private', 'shared');
CREATE TYPE public.circle_member_role AS ENUM ('admin', 'member');
CREATE TYPE public.calendar_sync_preference AS ENUM ('sync_mine', 'sync_all', 'no_sync');

-- ============================================================
-- Step 2: Tables (in dependency order)
-- ============================================================

-- One row per auth user; populated by trigger on auth.users insert
CREATE TABLE public.user_profile (
  id                              uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name                    text NOT NULL DEFAULT '',
  push_token                      text,
  push_token_updated_at           timestamptz,
  last_digest_shown_at            timestamptz,
  google_calendar_connected       boolean NOT NULL DEFAULT false,
  google_calendar_sync_preference public.calendar_sync_preference NOT NULL DEFAULT 'no_sync',
  created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.care_circle (
  id         uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.care_circle_member (
  circle_id uuid NOT NULL REFERENCES public.care_circle(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      public.circle_member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

CREATE TABLE public.circle_invites (
  id         uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id  uuid NOT NULL REFERENCES public.care_circle(id) ON DELETE CASCADE,
  token      text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Created before tasks because tasks.parent_appointment_id references this table
CREATE TABLE public.appointments (
  id                       uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title                    text NOT NULL,
  starts_at                timestamptz NOT NULL,
  duration_minutes         integer,
  assignee                 uuid REFERENCES auth.users(id),
  visibility               public.visibility NOT NULL DEFAULT 'shared',
  google_calendar_event_id text,
  circle_id                uuid NOT NULL REFERENCES public.care_circle(id),
  created_by               uuid NOT NULL REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id                    uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title                 text NOT NULL,
  recurrence            text,
  assignee              uuid REFERENCES auth.users(id),
  visibility            public.visibility NOT NULL DEFAULT 'shared',
  progress_note         text,
  due_date              timestamptz,
  completed             boolean NOT NULL DEFAULT false,
  completed_at          timestamptz,
  parent_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  circle_id             uuid NOT NULL REFERENCES public.care_circle(id),
  created_by            uuid NOT NULL REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Internal feature flags; no app UI in v0 — edit via Supabase Studio only
CREATE TABLE public.system_config (
  key        text NOT NULL PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Step 3: Indexes
-- ============================================================

CREATE INDEX idx_tasks_circle_id            ON public.tasks (circle_id);
CREATE INDEX idx_tasks_assignee             ON public.tasks (assignee);
CREATE INDEX idx_tasks_due_date             ON public.tasks (due_date);
CREATE INDEX idx_tasks_parent_appointment   ON public.tasks (parent_appointment_id);
CREATE INDEX idx_appointments_circle_id     ON public.appointments (circle_id);
CREATE INDEX idx_appointments_starts_at     ON public.appointments (starts_at);
CREATE INDEX idx_appointments_assignee      ON public.appointments (assignee);
CREATE INDEX idx_circle_member_user_id      ON public.care_circle_member (user_id);

-- ============================================================
-- Step 4: Helper functions (SECURITY DEFINER — bypass RLS for use inside policies)
-- ============================================================

-- True if the current user is a member of the given circle
CREATE OR REPLACE FUNCTION public.is_circle_member(p_circle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_circle_member
    WHERE circle_id = p_circle_id AND user_id = auth.uid()
  );
$$;

-- True if the current user is an admin of the given circle
CREATE OR REPLACE FUNCTION public.is_circle_admin(p_circle_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_circle_member
    WHERE circle_id = p_circle_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- True if the current user shares any circle with the given user
CREATE OR REPLACE FUNCTION public.shares_circle_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_circle_member m1
    JOIN care_circle_member m2 ON m1.circle_id = m2.circle_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = p_user_id
  );
$$;

-- Atomically creates a care circle and adds the caller as admin in one transaction.
-- Called from the app service layer instead of two separate inserts.
CREATE OR REPLACE FUNCTION public.create_care_circle(p_name text)
RETURNS public.care_circle
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circle public.care_circle;
BEGIN
  INSERT INTO care_circle (name, created_by)
  VALUES (p_name, auth.uid())
  RETURNING * INTO v_circle;

  INSERT INTO care_circle_member (circle_id, user_id, role)
  VALUES (v_circle.id, auth.uid(), 'admin');

  RETURN v_circle;
END;
$$;

-- ============================================================
-- Step 5: Trigger — auto-create user_profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profile (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', ''));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Step 6: Row Level Security
-- ============================================================

ALTER TABLE public.user_profile      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_circle       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_circle_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_invites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config     ENABLE ROW LEVEL SECURITY;

-- user_profile
CREATE POLICY "user_profile_select" ON public.user_profile
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.shares_circle_with(id));

CREATE POLICY "user_profile_insert" ON public.user_profile
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profile_update" ON public.user_profile
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- care_circle
CREATE POLICY "care_circle_select" ON public.care_circle
  FOR SELECT TO authenticated
  USING (public.is_circle_member(id));

CREATE POLICY "care_circle_insert" ON public.care_circle
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "care_circle_update" ON public.care_circle
  FOR UPDATE TO authenticated
  USING (public.is_circle_admin(id));

-- care_circle_member
CREATE POLICY "care_circle_member_select" ON public.care_circle_member
  FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id));

CREATE POLICY "care_circle_member_insert" ON public.care_circle_member
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_circle_admin(circle_id));

CREATE POLICY "care_circle_member_update" ON public.care_circle_member
  FOR UPDATE TO authenticated
  USING (public.is_circle_admin(circle_id));

CREATE POLICY "care_circle_member_delete" ON public.care_circle_member
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_circle_admin(circle_id));

-- circle_invites
CREATE POLICY "circle_invites_select" ON public.circle_invites
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "circle_invites_insert" ON public.circle_invites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_circle_admin(circle_id));

-- Any authenticated user can mark an invite used (the join flow stamps used_at)
CREATE POLICY "circle_invites_update" ON public.circle_invites
  FOR UPDATE TO authenticated
  USING (used_at IS NULL AND expires_at > now());

-- appointments
CREATE POLICY "appointments_select" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    public.is_circle_member(circle_id)
    AND (visibility = 'shared' OR created_by = auth.uid())
  );

CREATE POLICY "appointments_insert" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_circle_member(circle_id));

CREATE POLICY "appointments_update" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    public.is_circle_member(circle_id)
    AND (created_by = auth.uid() OR assignee = auth.uid())
  );

CREATE POLICY "appointments_delete" ON public.appointments
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- tasks
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.is_circle_member(circle_id)
    AND (visibility = 'shared' OR created_by = auth.uid())
  );

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_circle_member(circle_id));

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_circle_member(circle_id)
    AND (created_by = auth.uid() OR assignee = auth.uid())
  );

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- system_config: read-only from app; no write policies (service role via Supabase Studio only)
CREATE POLICY "system_config_select" ON public.system_config
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- Step 7: Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks, public.appointments;
