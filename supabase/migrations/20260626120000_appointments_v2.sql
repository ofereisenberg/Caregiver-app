-- Appointments v2: replace duration_minutes with proper time range, add location and recurrence

ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS duration_minutes,
  ADD COLUMN IF NOT EXISTS ends_at        timestamptz,
  ADD COLUMN IF NOT EXISTS is_full_day    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location       text,
  ADD COLUMN IF NOT EXISTS recurrence     text;
