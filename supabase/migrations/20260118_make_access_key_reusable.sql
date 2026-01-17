-- Function to handle new user access key validation (Reusable version)
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

    -- Check if key exists (Reusable: WE DO NOT CHECK used_by)
    select exists (
        select 1 from public.access_keys
        where code = access_key_code
    ) into key_exists;

    if not key_exists then
        raise exception 'Invalid access key';
    end if;

    -- Reusable: WE DO NOT MARK AS USED
    -- We simply allow the user creation to proceed if the key is valid.

    return new;
end;
$$ language plpgsql;
