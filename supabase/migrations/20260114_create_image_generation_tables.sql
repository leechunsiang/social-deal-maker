-- Create table for tracking image generation requests
CREATE TABLE IF NOT EXISTS public.image_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for storing individual generated images
CREATE TABLE IF NOT EXISTS public.generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID REFERENCES public.image_generations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Policies for image_generations
DROP POLICY IF EXISTS "Users can view their own generations" ON public.image_generations;
CREATE POLICY "Users can view their own generations"
    ON public.image_generations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own generations" ON public.image_generations;
CREATE POLICY "Users can insert their own generations"
    ON public.image_generations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies for generated_images
DROP POLICY IF EXISTS "Users can view their own generated images" ON public.generated_images;
CREATE POLICY "Users can view their own generated images"
    ON public.generated_images FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own generated images" ON public.generated_images;
CREATE POLICY "Users can insert their own generated images"
    ON public.generated_images FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for generated images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated_images', 'generated_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload generated images" ON storage.objects;
CREATE POLICY "Users can upload generated images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'generated_images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can view generated images" ON storage.objects;
CREATE POLICY "Users can view generated images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'generated_images' AND auth.uid() = owner);
