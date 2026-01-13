-- Create table for storing repurposed content history
CREATE TABLE IF NOT EXISTS public.repurposed_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    original_content TEXT NOT NULL,
    output_format TEXT NOT NULL,
    repurposed_content TEXT NOT NULL,
    source_type TEXT, -- 'paste', 'upload', 'generated_image'
    source_image_path TEXT, -- If source was a generated image
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_repurposed_content_user_id ON public.repurposed_content(user_id);
CREATE INDEX idx_repurposed_content_created_at ON public.repurposed_content(created_at DESC);

-- Enable RLS
ALTER TABLE public.repurposed_content ENABLE ROW LEVEL SECURITY;

-- Policies for repurposed_content
DROP POLICY IF EXISTS "Users can view their own repurposed content history" ON public.repurposed_content;
CREATE POLICY "Users can view their own repurposed content history"
    ON public.repurposed_content FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own repurposed content history" ON public.repurposed_content;
CREATE POLICY "Users can insert their own repurposed content history"
    ON public.repurposed_content FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own repurposed content history" ON public.repurposed_content;
CREATE POLICY "Users can delete their own repurposed content history"
    ON public.repurposed_content FOR DELETE
    USING (auth.uid() = user_id);
