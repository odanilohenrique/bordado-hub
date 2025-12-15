-- Create Portfolio Bucket for Programmer Work Samples
-- Run this in Supabase SQL Editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public portfolio read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload portfolio"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'portfolio' 
    AND auth.role() = 'authenticated'
);

-- Allow users to update their own portfolio files
CREATE POLICY "Users can update own portfolio files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'portfolio' 
    AND auth.role() = 'authenticated'
);

-- Allow users to delete their own portfolio files
CREATE POLICY "Users can delete own portfolio files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'portfolio' 
    AND auth.role() = 'authenticated'
);
