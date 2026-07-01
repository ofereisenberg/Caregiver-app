-- Reminders & push notification infrastructure

-- Add reminder offset to tasks (null = no reminder)
ALTER TABLE tasks ADD COLUMN reminder_offset_minutes integer;

-- Add reminder offset to appointments (null = no reminder)
ALTER TABLE appointments ADD COLUMN reminder_offset_minutes integer;

-- Add reminders opt-in to user_profile (default off)
ALTER TABLE user_profile ADD COLUMN reminders_enabled boolean NOT NULL DEFAULT false;

-- Notification log: tracks every push notification sent
-- Used to prevent duplicate sends and for future debugging
CREATE TABLE notification_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES user_profile(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,       -- 'reminder' | 'task_assignment' | etc.
  item_type         text,                -- 'task' | 'appointment' | null
  item_id           uuid,
  sent_at           timestamptz NOT NULL DEFAULT now(),
  success           boolean NOT NULL,
  scheduled_for     timestamptz,
  error_message     text
);

-- RLS: users can read their own notification history
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification log"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (Edge Functions) handles inserts — no insert policy needed for anon/authenticated
