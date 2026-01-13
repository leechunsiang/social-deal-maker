-- Make media_url optional to support text-only posts (e.g. for Facebook)
ALTER TABLE public.scheduled_posts ALTER COLUMN media_url DROP NOT NULL;

-- Also add 'media_urls' column if we want to store multiple items (already referenced in code, checking if it exists)
-- Best practice: Add it if missing. 
-- But wait, standard post dialog code uses 'media_urls' in insert. 
-- Schema shows it DOES NOT EXIST. The insert would fail on 'media_urls' too!

ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS media_urls text[];
