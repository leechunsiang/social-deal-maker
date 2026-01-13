-- Create a new storage bucket for repurpose uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('repurpose_uploads', 'repurpose_uploads', true) -- Public for easier access, or false if strictly private
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'repurpose_uploads' AND auth.uid() = owner);

-- Policy: Authenticated users can view their own files
CREATE POLICY "Authenticated users can select own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'repurpose_uploads' AND auth.uid() = owner);

-- Policy: Authenticated users can delete their own files
CREATE POLICY "Authenticated users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'repurpose_uploads' AND auth.uid() = owner);
