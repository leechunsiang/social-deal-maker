
-- Create the storage bucket for posts
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

-- Set up security policies for the 'posts' bucket

-- 1. Allow public read access to everyone
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'posts' );

-- 2. Allow authenticated users to upload files
create policy "Authenticated Users Can Upload"
  on storage.objects for insert
  with check ( bucket_id = 'posts' and auth.role() = 'authenticated' );

-- 3. Allow users to update their own files (optional, but good for edits)
create policy "Users Can Update Own Files"
  on storage.objects for update
  using ( bucket_id = 'posts' and auth.uid() = owner );

-- 4. Allow users to delete their own files
create policy "Users Can Delete Own Files"
  on storage.objects for delete
  using ( bucket_id = 'posts' and auth.uid() = owner );
