-- Add index on user_id for better performance (and RLS/Realtime filtering)
create index if not exists notifications_user_id_idx on public.notifications(user_id);

-- Explicitly add table to publication skipped as it already exists
-- alter publication supabase_realtime add table public.notifications;

-- Verify replication identity (usually default is fine, but ensures ID is available)
alter table public.notifications replica identity default;
