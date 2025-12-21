
alter table public.scheduled_posts
drop constraint if exists scheduled_posts_post_type_check;

alter table public.scheduled_posts
add constraint scheduled_posts_post_type_check
check (post_type in ('POST', 'REEL', 'STORY', 'CAROUSEL'));

alter table public.scheduled_posts
add column if not exists media_urls text[];
