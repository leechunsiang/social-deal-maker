-- Create comment_replies table to store replies to Facebook comments
CREATE TABLE IF NOT EXISTS public.comment_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE NOT NULL,
  fb_reply_id text UNIQUE NOT NULL,
  message text NOT NULL,
  created_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add index for efficient querying by comment_id
CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id 
ON public.comment_replies(comment_id);

-- Add index for fb_reply_id
CREATE INDEX IF NOT EXISTS idx_comment_replies_fb_reply_id 
ON public.comment_replies(fb_reply_id);

-- Enable RLS
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;

-- Create policies - users can view replies on comments from their own posts
CREATE POLICY "Users can view replies on their comments"
  ON public.comment_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.post_comments
      JOIN public.scheduled_posts ON post_comments.post_id = scheduled_posts.id
      WHERE post_comments.id = comment_replies.comment_id
      AND scheduled_posts.user_id = auth.uid()
    )
  );

-- Allow service role to insert/update replies (for edge functions)
CREATE POLICY "Service role can insert replies"
  ON public.comment_replies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update replies"
  ON public.comment_replies FOR UPDATE
  USING (true);
