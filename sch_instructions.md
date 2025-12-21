# Scheduling Setup Instructions

The automatic posting feature requires a **Cron Job** and **Environment Secrets**.

## 1. Set Function Secrets (CRITICAL)

Your Edge Function `publish-instagram-post` needs Instagram credentials to work. These are NOT stored in your code for security.

1. Go to [Supabase Dashboard > Edge Functions > Secrets](https://supabase.com/dashboard/project/jjrfayfncwljjcdwumho/functions/secrets).
2. Add the following secrets (get values from your `.env` file if you have one locally, or your Meta Developer Portal):
   - `IG_ACCESS_TOKEN`: Your Instagram Graph API Access Token.
   - `IG_ID`: Your Instagram Business Account ID.

## 2. Run Database Updates

I have created migrations to fix the database schema and reset your failed posts.

**Run these commands in your terminal:**

```bash
npx supabase db push
```

**Or run these SQL files in the Dashboard SQL Editor:**

1. `supabase/migrations/20241221_enable_cron.sql` (If not already done)
2. `supabase/migrations/20241221_schedule_job.sql` (If not already done)
3. `supabase/migrations/20241221_add_error_column.sql` (Fixes missing error log)
4. `supabase/migrations/20241221_retry_posts.sql` (Retries your failed post)

## 3. Verify

After setting secrets and running the SQL:

1. Wait 1 minute.
2. Check your Dashboard. The post should change from "FAILED" to "PUBLISHED" (or "SCHEDULED" momentarily).
