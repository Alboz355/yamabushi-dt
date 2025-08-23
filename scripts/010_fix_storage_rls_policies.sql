-- Fix RLS policies for Supabase Storage
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete profile photos" ON storage.objects;

-- Create policy to allow authenticated users to upload profile photos
CREATE POLICY "Allow authenticated users to upload profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow authenticated users to read profile photos
CREATE POLICY "Allow authenticated users to read profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

-- Create policy to allow authenticated users to update their own profile photos
CREATE POLICY "Allow authenticated users to update profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow authenticated users to delete their own profile photos
CREATE POLICY "Allow authenticated users to delete profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Enable RLS on storage.buckets if not already enabled
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop existing bucket policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to access profile photos bucket" ON storage.buckets;

-- Create policy to allow authenticated users to access the profile-photos bucket
CREATE POLICY "Allow authenticated users to access profile photos bucket"
ON storage.buckets
FOR SELECT
TO authenticated
USING (id = 'profile-photos');
