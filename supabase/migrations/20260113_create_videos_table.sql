-- Create the videos table
create table if not exists videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  storage_path text not null,
  status text check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  transcription text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on videos table
alter table videos enable row level security;

-- Create policies for videos table
create policy "Users can view own videos"
  on videos for select
  using ( auth.uid() = user_id );

create policy "Users can insert own videos"
  on videos for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own videos"
  on videos for update
  using ( auth.uid() = user_id );

create policy "Users can delete own videos"
  on videos for delete
  using ( auth.uid() = user_id );

-- Create the storage bucket for videos if it doesn't exist
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

-- Set up security policies for the 'videos' bucket

-- 1. Allow public read access to everyone (or restrict to authenticated if needed, but public is easier for playback)
create policy "Public Access Videos"
  on storage.objects for select
  using ( bucket_id = 'videos' );

-- 2. Allow authenticated users to upload files
create policy "Authenticated Users Can Upload Videos"
  on storage.objects for insert
  with check ( bucket_id = 'videos' and auth.role() = 'authenticated' );

-- 3. Allow users to update their own files
create policy "Users Can Update Own Video Files"
  on storage.objects for update
  using ( bucket_id = 'videos' and auth.uid() = owner );

-- 4. Allow users to delete their own files
create policy "Users Can Delete Own Video Files"
  on storage.objects for delete
  using ( bucket_id = 'videos' and auth.uid() = owner );
