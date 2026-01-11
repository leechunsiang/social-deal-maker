-- Create post_analytics table to store engagement metrics for Instagram and Facebook posts
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.scheduled_posts(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  platform_post_id text NOT NULL,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  saved_count integer DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for efficient querying by post_id
CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id 
ON public.post_analytics(post_id);

-- Add index for platform_post_id
CREATE INDEX IF NOT EXISTS idx_post_analytics_platform_post_id 
ON public.post_analytics(platform_post_id);

-- Add unique constraint to prevent duplicate analytics for the same post
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_analytics_unique_post 
ON public.post_analytics(post_id, platform);

-- Enable RLS
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies - users can view analytics on their own posts
CREATE POLICY "Users can view analytics on their own posts"
  ON public.post_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts
      WHERE scheduled_posts.id = post_analytics.post_id
      AND scheduled_posts.user_id = auth.uid()
    )
  );

-- Allow service role to insert/update analytics (for edge functions)
CREATE POLICY "Service role can insert analytics"
  ON public.post_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update analytics"
  ON public.post_analytics FOR UPDATE
  USING (true);
