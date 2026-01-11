-- Add Instagram post ID column to scheduled_posts table
ALTER TABLE public.scheduled_posts
ADD COLUMN IF NOT EXISTS ig_post_id text;

-- Add index for efficient querying by ig_post_id
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_ig_post_id 
ON public.scheduled_posts(ig_post_id);
