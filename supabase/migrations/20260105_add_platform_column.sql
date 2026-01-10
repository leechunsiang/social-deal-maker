-- Add platform column to scheduled_posts table
ALTER TABLE public.scheduled_posts 
ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'instagram' 
CHECK (platform IN ('instagram', 'facebook'));

-- Add index for querying by platform
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform 
ON public.scheduled_posts(platform);

-- Add index for querying by platform and status
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform_status 
ON public.scheduled_posts(platform, status);
