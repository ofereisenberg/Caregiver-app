-- Migration: 20260628100000_active_circle.sql
-- Add active_circle_id to user_profile for multi-circle support

ALTER TABLE public.user_profile
  ADD COLUMN active_circle_id uuid REFERENCES public.care_circle(id) ON DELETE SET NULL;
