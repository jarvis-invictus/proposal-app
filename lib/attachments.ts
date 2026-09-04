import { createClient } from '@/lib/supabase/client'

export type AttachmentType = 'image' | 'video'
export type Attachment = { url: string; type: AttachmentType; caption?: string }

/** Recovers an object's path within the `public-assets` bucket from a URL produced by
 * `.getPublicUrl()` — the inverse of that call, needed anywhere a stored URL is the only thing
 * left to delete the actual object by (e.g. removing an attachment, or a brand kit's logo). */
export function publicAssetPath(url: string): string | null {
  const marker = '/public-assets/'
  const i = url.indexOf(marker)
  return i === -1 ? null : url.slice(i + marker.length)
}

// These stay the real client-side limits for immediate, specific feedback ("Videos must be
// under 25MB") — the bucket itself also enforces a 25MB/image-or-video ceiling server-side
// (20260904020000_storage_hygiene.sql) so a request that bypasses this file entirely (hitting
// the Storage API directly with the same anon key any browser has) can't upload past that, even
// though it won't get the friendlier per-type message this validation gives.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024

export function attachmentTypeFor(file: File): AttachmentType | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

/** Validates a file before it's ever uploaded — returns an error message, or null if it's fine. */
export function validateAttachmentFile(file: File): string | null {
  const type = attachmentTypeFor(file)
  if (!type) return 'Only image or video files are supported.'
  const limit = type === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > limit) {
    const limitMb = Math.round(limit / (1024 * 1024))
    return `${type === 'video' ? 'Videos' : 'Images'} must be under ${limitMb}MB.`
  }
  return null
}

/** Same public-assets bucket and account-scoped path convention as avatar/QR uploads
 * (`app/dashboard/settings/SettingsClient.tsx`'s uploadToPublicAssets), but with a per-upload
 * unique filename instead of a fixed one — a proposal can carry more than one attachment, so
 * unlike avatar/QR this can't overwrite the same path on every upload. */
export async function uploadAttachment(accountId: string, proposalId: string, file: File): Promise<Attachment> {
  const type = attachmentTypeFor(file)
  if (!type) throw new Error('Only image or video files are supported.')
  const sizeError = validateAttachmentFile(file)
  if (sizeError) throw new Error(sizeError)

  const supabase = createClient()
  const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'png')
  const path = `${accountId}/attachments/${proposalId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('public-assets').upload(path, file)
  if (error) throw new Error(error.message)
  const url = supabase.storage.from('public-assets').getPublicUrl(path).data.publicUrl
  return { url, type }
}

/** Removes an attachment's underlying storage object — best-effort; the caller has already
 * dropped it from the proposal's content array either way, so a failure here just leaves an
 * orphaned file rather than a broken UI. */
export async function deleteAttachment(url: string): Promise<void> {
  const path = publicAssetPath(url)
  if (!path) return
  const supabase = createClient()
  await supabase.storage.from('public-assets').remove([path])
}
