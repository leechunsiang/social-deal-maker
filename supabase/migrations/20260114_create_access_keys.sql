-- Create access_keys table
create table if not exists public.access_keys (
    code text primary key,
    created_at timestamptz default now(),
    used_by uuid references auth.users(id),
    used_at timestamptz
);

-- Enable RLS
alter table public.access_keys enable row level security;

-- Function to handle new user access key validation
create or replace function public.handle_new_user_access_key()
returns trigger
security definer
as $$
declare
    access_key_code text;
    key_exists boolean;
begin
    -- Extract access key from user metadata
    access_key_code := new.raw_user_meta_data->>'access_key';

    if access_key_code is null then
        raise exception 'Access key is required';
    end if;

    -- Check if key exists and is unused
    select exists (
        select 1 from public.access_keys
        where code = access_key_code
        and used_by is null
    ) into key_exists;

    if not key_exists then
        raise exception 'Invalid or used access key';
    end if;

    -- Mark key as used
    update public.access_keys
    set used_by = new.id,
        used_at = now()
    where code = access_key_code;

    return new;
end;
$$ language plpgsql;

-- Trigger
drop trigger if exists on_auth_user_created_check_access_key on auth.users;
create trigger on_auth_user_created_check_access_key
    after insert on auth.users
    for each row execute function public.handle_new_user_access_key();
