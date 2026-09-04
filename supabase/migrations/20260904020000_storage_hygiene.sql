-- Storage & data hygiene: the public-assets bucket had no file-size/type limit of its own —
-- every enforcement was client-side JS (lib/attachments.ts), trivially bypassed by uploading
-- directly against the Storage API with the same anon key any browser already has. 25MB is the
-- higher of the two client-side ceilings (image 5MB, video 25MB) — a single bucket-level limit
-- can't vary by MIME type, so this is a real ceiling, not a recreation of the exact client rule.
UPDATE storage.buckets
SET file_size_limit = 26214400, -- 25MB in bytes
    allowed_mime_types = ARRAY['image/*', 'video/*']
WHERE id = 'public-assets';

-- INSERT and UPDATE policies already exist for this bucket (Correction 1) but DELETE never got
-- one, so account members could upload and overwrite their own assets but never actually delete
-- them — the missing half of "manage your own files", and a blocker for the storage cleanup
-- this migration's app-code counterpart adds to deleteProposal/deleteBrandKit/removeAttachment.
DROP POLICY IF EXISTS "Account members can delete their own assets" ON storage.objects;
CREATE POLICY "Account members can delete their own assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'public-assets' AND (storage.foldername(name))[1] = get_account_id()::text);
