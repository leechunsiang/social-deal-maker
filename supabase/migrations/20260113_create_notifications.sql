create table if not exists public.notifications (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null default auth.uid(),
    type text not null, -- 'post_status', 'new_message', 'new_comment'
    title text not null,
    message text not null,
    is_read boolean not null default false,
    created_at timestamp with time zone not null default now(),
    metadata jsonb default '{}'::jsonb,
    constraint notifications_pkey primary key (id),
    constraint notifications_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Users can view their own notifications" on public.notifications
    for select using (auth.uid() = user_id);

create policy "Users can update their own notifications" on public.notifications
    for update using (auth.uid() = user_id);
    
-- Enable Realtime
alter publication supabase_realtime add table public.notifications;
