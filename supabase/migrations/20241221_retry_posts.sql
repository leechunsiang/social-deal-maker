-- Reset failed posts to scheduled for retry
update public.scheduled_posts
set status = 'scheduled', error_message = null
where status = 'failed';
