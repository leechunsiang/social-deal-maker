-- Add fb_post_id column to scheduled_posts table to track Facebook post IDs
ALTER TABLE public.scheduled_posts 
ADD COLUMN IF NOT EXISTS fb_post_id text;

-- Add index for querying by fb_post_id
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_fb_post_id 
ON public.scheduled_posts(fb_post_id);
