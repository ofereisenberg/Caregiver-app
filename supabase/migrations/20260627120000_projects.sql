-- Migration: 20260627120000_projects.sql
-- Add Projects feature: new table, status enum, FK columns on tasks/appointments, RLS, Realtime

-- ============================================================
-- Step 1: Enum
-- ============================================================

CREATE TYPE public.project_status AS ENUM ('not_started', 'in_progress', 'done');

-- ============================================================
-- Step 2: Projects table
-- ============================================================

CREATE TABLE public.projects (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text,
  owner       uuid REFERENCES auth.users(id),
  due_date    date,
  status      public.project_status NOT NULL DEFAULT 'not_started',
  visibility  public.visibility NOT NULL DEFAULT 'shared',
  circle_id   uuid NOT NULL REFERENCES public.care_circle(id),
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Step 3: Indexes on projects
-- ============================================================

CREATE INDEX idx_projects_circle_id ON public.projects (circle_id);
CREATE INDEX idx_projects_status    ON public.projects (status);

-- ============================================================
-- Step 4: Add project_id FK to existing tables
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
  ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_project_id        ON public.tasks (project_id);
CREATE INDEX idx_appointments_project_id ON public.appointments (project_id);

-- ============================================================
-- Step 5: Row Level Security on projects
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.is_circle_member(circle_id)
    AND (visibility = 'shared' OR created_by = auth.uid())
  );

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_circle_member(circle_id));

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_circle_member(circle_id));

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ============================================================
-- Step 6: Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
