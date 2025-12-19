
create table if not exists public.scheduled_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  media_url text not null,
  caption text,
  post_type text not null check (post_type in ('POST', 'REEL', 'STORY')),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'published', 'failed')),
  instagram_container_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.scheduled_posts enable row level security;

-- Create policies
create policy "Users can view their own scheduled posts"
  on public.scheduled_posts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own scheduled posts"
  on public.scheduled_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own scheduled posts"
  on public.scheduled_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own scheduled posts"
  on public.scheduled_posts for delete
  using (auth.uid() = user_id);
