-- Migration: 20260630000000_vacations.sql
-- Add vacation table for on-vacation calendar entries

CREATE TABLE public.vacations (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id       uuid        NOT NULL REFERENCES public.care_circle(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  start_date      date        NOT NULL,
  end_date        date        NOT NULL,
  with_member_ids uuid[]      NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vacations_date_order CHECK (end_date >= start_date)
);

CREATE INDEX idx_vacations_circle_id  ON public.vacations (circle_id);
CREATE INDEX idx_vacations_user_id    ON public.vacations (user_id);
CREATE INDEX idx_vacations_start_date ON public.vacations (start_date);
CREATE INDEX idx_vacations_end_date   ON public.vacations (end_date);

ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

-- All circle members can read vacations in their circle
CREATE POLICY "vacations_select" ON public.vacations
  FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id));

-- Only the owner can create their own vacation entry
CREATE POLICY "vacations_insert" ON public.vacations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_circle_member(circle_id));

-- Only the owner can edit
CREATE POLICY "vacations_update" ON public.vacations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Only the owner can delete
CREATE POLICY "vacations_delete" ON public.vacations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.vacations;
