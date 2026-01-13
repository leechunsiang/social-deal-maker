-- Update platform column check constraint in scheduled_posts table
ALTER TABLE public.scheduled_posts 
DROP CONSTRAINT IF EXISTS scheduled_posts_platform_check;

ALTER TABLE public.scheduled_posts 
ADD CONSTRAINT scheduled_posts_platform_check 
CHECK (platform IN ('instagram', 'facebook', 'x', 'linkedin', 'tiktok'));
