-- Enable pg_cron for scheduling
create extension if not exists pg_cron with schema extensions;

-- Enable pg_net for HTTP requests from the database
create extension if not exists pg_net with schema extensions;

-- Grant usage to postgres (standard)
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

grant usage on schema net to postgres;
grant all privileges on all tables in schema net to postgres;
