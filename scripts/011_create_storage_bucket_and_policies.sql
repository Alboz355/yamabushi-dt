-- Create the profile-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload their own photos
CREATE POLICY "Users can upload their own profile photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to view their own photos
CREATE POLICY "Users can view their own profile photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to update their own photos
CREATE POLICY "Users can update their own profile photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own photos
CREATE POLICY "Users can delete their own profile photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view profile photos
CREATE POLICY "Public can view profile photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profile-photos');
