-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA net TO postgres;

-- Schedule send-reminders to run every 5 minutes via pg_cron + pg_net
SELECT cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://icmtktdbqrcgtbeiggdc.supabase.co/functions/v1/send-reminders',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
