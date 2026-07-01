-- Add language preference to user_profile
-- Supported values: 'de' (German), 'en' (English)
ALTER TABLE public.user_profile
  ADD COLUMN language text NOT NULL DEFAULT 'de'
    CHECK (language IN ('de', 'en'));
