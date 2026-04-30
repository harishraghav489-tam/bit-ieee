-- Storage bucket for post media (images & videos)
-- Run this in Supabase SQL Editor

-- Create the media bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to media/posts/
CREATE POLICY "Users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'posts'
  AND auth.role() = 'authenticated'
);

-- Allow public read access (bucket is public)
CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media'
  AND auth.uid() IN (
    SELECT author_id FROM posts WHERE media_url LIKE '%' || name
  )
);
