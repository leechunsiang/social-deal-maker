-- Add error_message column to scheduled_posts if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'scheduled_posts' and column_name = 'error_message') then
    alter table public.scheduled_posts add column error_message text;
  end if;
end $$;
