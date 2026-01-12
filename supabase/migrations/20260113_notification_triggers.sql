-- Trigger function for scheduled posts status changes
create or replace function public.handle_scheduled_post_status_change()
returns trigger as $$
begin
    if new.status = 'failed' and old.status != 'failed' then
        insert into public.notifications (user_id, type, title, message, metadata)
        values (
            new.user_id,
            'post_status',
            'Post Failed',
            'Your post scheduled for ' || to_char(new.scheduled_time, 'YYYY-MM-DD HH24:MI') || ' has failed.',
            jsonb_build_object('post_id', new.id, 'platform', new.platform)
        );
    elsif new.status = 'published' and old.status != 'published' then
        insert into public.notifications (user_id, type, title, message, metadata)
        values (
            new.user_id,
            'post_status',
            'Post Published',
            'Your post has been successfully published to ' || new.platform || '.',
            jsonb_build_object('post_id', new.id, 'platform', new.platform)
        );
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger for scheduled_posts
drop trigger if exists on_scheduled_post_status_change on public.scheduled_posts;
create trigger on_scheduled_post_status_change
    after update on public.scheduled_posts
    for each row
    execute function public.handle_scheduled_post_status_change();


-- Trigger function for new incoming messages (Messenger)
create or replace function public.handle_new_messenger_message()
returns trigger as $$
declare
    v_user_record record;
begin
    -- Check if direction is inbound (from user to page)
    -- We use 'inbound' based on the table definition
    
    -- Since messenger_leads are global (no user_id owner), we notify ALL users 
    -- or just the likely owner. For this system, we will notify all registered users
    -- because the dashboard seems shared.
    
    for v_user_record in select id from auth.users loop
        insert into public.notifications (user_id, type, title, message, metadata)
        values (
            v_user_record.id,
            'new_message',
            'New Message',
            'You have a new message from a lead.',
            jsonb_build_object('lead_id', new.lead_id, 'message_id', new.id)
        );
    end loop;
    
    return new;
end;
$$ language plpgsql security definer;

-- Trigger for messenger_messages
drop trigger if exists on_new_messenger_message on public.messenger_messages;
create trigger on_new_messenger_message
    after insert on public.messenger_messages
    for each row
    when (new.direction = 'inbound')
    execute function public.handle_new_messenger_message();
