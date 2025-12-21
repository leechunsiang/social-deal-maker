# Scheduling Setup Instructions

The automatic posting feature requires a **Cron Job** to run checking for due posts every minute.

## Option 1: Run Migrations (Fastest)

I have created two migration files that will set this up for you automatically:

1. `supabase/migrations/20241221_enable_cron.sql` (Enables extensions)
2. `supabase/migrations/20241221_schedule_job.sql` (Schedules the job)

**To apply these:**

1. Run `npx supabase db push` (if you are linked)
2. Or copy the contents of these files and run them in the **SQL Editor** of your Supabase Dashboard.

> **Warning:** The `schedule_job.sql` file contains your Service Role Key to authorize the database to call your Edge Function. If you open-source this repo, ensure you remove that file or Revoke the key and generate a new one.

## Option 2: Setup via Dashboard (Manual)

If you prefer not to use the migration files:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/jjrfayfncwljjcdwumho).
2. Go to **Database** -> **Extensions** and enable `pg_cron` and `pg_net`.
3. Go to **Integrations** use the Side Bar to find **Cron Loops** or just go to **SQL Editor**.
4. Run the following SQL (Replace `YOUR_SERVICE_KEY` with your actual Service Role Key found in Settings -> API):

```sql
select cron.schedule(
  'check-scheduled-posts-every-minute',
  '* * * * *',
  $$
  select
    net.http_post(
        url:='https://jjrfayfncwljjcdwumho.supabase.co/functions/v1/check-scheduled-posts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```
