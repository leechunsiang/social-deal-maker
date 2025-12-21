-- Schedule the check-scheduled-posts function to run every minute
-- NOTE: This migration contains a Service Role Key. If you commit this to a public repo, rotate your keys immediately.

select cron.schedule(
  'check-scheduled-posts-every-minute', -- name of the cron job
  '* * * * *',                          -- every minute
  $$
  select
    net.http_post(
        url:='https://jjrfayfncwljjcdwumho.supabase.co/functions/v1/check-scheduled-posts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcmZheWZuY3dsampjZHd1bWhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgxMDQzNSwiZXhwIjoyMDgxMzg2NDM1fQ.04SdLadbZWqrLg3AJXAGwosmTsLhi5q_mkcsdujcHvA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
