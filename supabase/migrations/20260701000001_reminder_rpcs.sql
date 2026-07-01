-- RPC: tasks due for a reminder in the current 5-minute cron window
CREATE OR REPLACE FUNCTION get_due_task_reminders()
RETURNS TABLE (
  id       uuid,
  title    text,
  assignee uuid,
  due_label text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    t.id,
    t.title,
    t.assignee,
    CASE
      WHEN t.due_date - now() < interval '1 hour'
        THEN 'Due in ' || EXTRACT(MINUTE FROM (t.due_date - now()))::int || ' minutes'
      WHEN t.due_date - now() < interval '1 day'
        THEN 'Due in ' || EXTRACT(HOUR FROM (t.due_date - now()))::int || ' hours'
      ELSE
        'Due on ' || to_char(t.due_date AT TIME ZONE 'UTC', 'Mon DD')
    END AS due_label
  FROM tasks t
  WHERE
    t.reminder_offset_minutes IS NOT NULL
    AND t.completed = false
    AND t.assignee IS NOT NULL
    AND t.due_date > now()
    -- reminder fires when: due_date - offset is within the past 5-minute window
    AND (t.due_date - (t.reminder_offset_minutes * interval '1 minute')) <= now()
    AND (t.due_date - (t.reminder_offset_minutes * interval '1 minute')) > now() - interval '5 minutes'
    -- skip if a successful reminder was already sent for this task
    AND NOT EXISTS (
      SELECT 1 FROM notification_log nl
      WHERE nl.item_type = 'task'
        AND nl.item_id = t.id
        AND nl.notification_type = 'reminder'
        AND nl.success = true
    );
$$;

-- RPC: appointments due for a reminder in the current 5-minute cron window
CREATE OR REPLACE FUNCTION get_due_appointment_reminders()
RETURNS TABLE (
  id          uuid,
  title       text,
  user_ids    uuid[],
  starts_label text
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
    END AS starts_label
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
    );
$$;
