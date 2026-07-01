-- Task reminder RPC uses due_date + start_time (both stored in UTC) to form
-- the trigger timestamp. Reminders only fire when start_time is set — date-only
-- tasks have no meaningful time to count down from (use daily digest for those).
DROP FUNCTION IF EXISTS get_due_task_reminders();

CREATE FUNCTION get_due_task_reminders()
RETURNS TABLE (
  id            uuid,
  title         text,
  assignee      uuid,
  due_label     text,
  scheduled_for timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    t.id,
    t.title,
    t.assignee,
    CASE
      WHEN task_time - now() < interval '1 hour'
        THEN 'In ' || EXTRACT(MINUTE FROM (task_time - now()))::int || ' minutes'
      WHEN task_time - now() < interval '1 day'
        THEN 'In ' || EXTRACT(HOUR FROM (task_time - now()))::int || ' hours'
      ELSE
        'On ' || to_char(task_time AT TIME ZONE 'UTC', 'Mon DD')
    END AS due_label,
    task_time AS scheduled_for
  FROM tasks t
  CROSS JOIN LATERAL (
    SELECT (t.due_date::date + t.start_time) AT TIME ZONE 'UTC' AS task_time
  ) ts
  WHERE
    t.reminder_offset_minutes IS NOT NULL
    AND t.start_time IS NOT NULL
    AND t.completed = false
    AND t.assignee IS NOT NULL
    AND task_time > now()
    AND (task_time - (t.reminder_offset_minutes * interval '1 minute')) <= now()
    AND (task_time - (t.reminder_offset_minutes * interval '1 minute')) > now() - interval '5 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM notification_log nl
      WHERE nl.item_type = 'task'
        AND nl.item_id = t.id
        AND nl.notification_type = 'reminder'
        AND nl.success = true
        AND nl.scheduled_for = task_time
    );
$$;

CREATE OR REPLACE FUNCTION get_due_appointment_reminders()
RETURNS TABLE (
  id            uuid,
  title         text,
  user_ids      uuid[],
  starts_label  text,
  scheduled_for timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    a.id,
    a.title,
    ARRAY(
      SELECT ai.user_id
      FROM appointment_invitees ai
      WHERE ai.appointment_id = a.id
    ) AS user_ids,
    CASE
      WHEN a.starts_at - now() < interval '1 hour'
        THEN 'Starts in ' || EXTRACT(MINUTE FROM (a.starts_at - now()))::int || ' minutes'
      WHEN a.starts_at - now() < interval '1 day'
        THEN 'Starts in ' || EXTRACT(HOUR FROM (a.starts_at - now()))::int || ' hours'
      ELSE
        'Starts on ' || to_char(a.starts_at AT TIME ZONE 'UTC', 'Mon DD')
    END AS starts_label,
    a.starts_at AS scheduled_for
  FROM appointments a
  WHERE
    a.reminder_offset_minutes IS NOT NULL
    AND a.starts_at > now()
    AND (a.starts_at - (a.reminder_offset_minutes * interval '1 minute')) <= now()
    AND (a.starts_at - (a.reminder_offset_minutes * interval '1 minute')) > now() - interval '5 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM notification_log nl
      WHERE nl.item_type = 'appointment'
        AND nl.item_id = a.id
        AND nl.notification_type = 'reminder'
        AND nl.success = true
        AND nl.scheduled_for = a.starts_at
    );
$$;
