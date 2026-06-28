-- Appointments v3: add free-text notes field

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS details text;
