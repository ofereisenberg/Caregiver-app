import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const NOTIFY_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify`;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function callNotify(
  user_ids: string[],
  title: string,
  body: string,
  item_type: string,
  item_id: string,
) {
  if (!user_ids.length) return;
  const res = await fetch(NOTIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      user_ids,
      notification_type: 'reminder',
      title,
      body,
      item_type,
      item_id,
      data: { item_type, item_id },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`notify failed: ${res.status} ${text}`);
  } else {
    console.log(`notify ok: ${await res.text()}`);
  }
}

serve(async () => {
  // --- Tasks ---
  // Find tasks whose reminder time falls within the last 5 minutes,
  // not yet completed, and not already sent.
  const { data: tasks } = await supabase.rpc('get_due_task_reminders');

  for (const task of tasks ?? []) {
    await callNotify(
      [task.assignee],
      `Reminder: ${task.title}`,
      task.due_label,
      'task',
      task.id,
    );
  }

  // --- Appointments ---
  // Same window check; recipients = invitees from appointment_invitees.
  const { data: appointments } = await supabase.rpc('get_due_appointment_reminders');

  for (const appt of appointments ?? []) {
    await callNotify(
      appt.user_ids,
      `Reminder: ${appt.title}`,
      appt.starts_label,
      'appointment',
      appt.id,
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
