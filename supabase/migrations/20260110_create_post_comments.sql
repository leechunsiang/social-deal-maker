-- Create post_comments table to store Facebook comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.scheduled_posts(id) ON DELETE CASCADE NOT NULL,
  fb_comment_id text UNIQUE NOT NULL,
  author_name text NOT NULL,
  author_id text NOT NULL,
  message text NOT NULL,
  created_time timestamptz NOT NULL,
  like_count integer DEFAULT 0,
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add index for efficient querying by post_id
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id 
ON public.post_comments(post_id);

-- Add index for fb_comment_id
CREATE INDEX IF NOT EXISTS idx_post_comments_fb_comment_id 
ON public.post_comments(fb_comment_id);

-- Enable RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Create policies - users can view comments on their own posts
CREATE POLICY "Users can view comments on their own posts"
  ON public.post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts
      WHERE scheduled_posts.id = post_comments.post_id
      AND scheduled_posts.user_id = auth.uid()
    )
  );

-- Allow service role to insert/update comments (for edge functions)
CREATE POLICY "Service role can insert comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update comments"
  ON public.post_comments FOR UPDATE
  USING (true);
