import { createClient } from '@/lib/supabase/client'

export type AttachmentType = 'image' | 'video'
export type Attachment = { url: string; type: AttachmentType; caption?: string }

// Neither Supabase Storage's bucket config nor a migration expresses a per-file limit for
// public-assets today (confirmed: only a local-dev-only global default exists) — these are
// enforced client-side here rather than left unbounded. Adjust if real usage calls for it.
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
