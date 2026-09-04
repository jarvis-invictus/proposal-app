'use server'

import { extractBrandKitFromUrl } from '@/lib/brand-extraction/url'
import { extractBrandKitFromImage } from '@/lib/brand-extraction/vision'
import { extractBrandKitFromText } from '@/lib/brand-extraction/text'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logError, logAction } from '@/lib/logging'
import { headers } from 'next/headers'
import { getAccountContext } from '@/lib/accountContext'
import { checkAiRateLimit, extractIpFromHeaders, rateLimitIdentifier } from '@/lib/ratelimit'

// No `export const maxDuration` here — a file with a top-level 'use server' may only export
// async functions; Next.js rejects any other export (confirmed by actually trying it: "Only
// async functions are allowed to be exported in a 'use server' file", which breaks every page
// that imports from this module, not just this one). The abortSignal timeout on each network
// call below (Firecrawl fetch, and inside vision.ts/text.ts) is what actually bounds a
// slow/hung call now — that's the real protection the platform's own default timeout used to be
// the only backstop for.
const MAX_URL_LENGTH = 2000
const MAX_DESCRIPTION_LENGTH = 5000

// Unlike saveBrandKit/deleteBrandKit below (which already require auth), these three had no
// auth check at all — meaning nothing stopped an unauthenticated caller from triggering paid
// OpenAI/Firecrawl calls, and there was no accountId to rate-limit by. Required here so
// rate-limiting is actually meaningful, matching every other AI route in the app.
async function requireAccountForExtraction() {
  const account = await getAccountContext()
  if (!account) throw new Error('Unauthorized')
  const ip = extractIpFromHeaders((await headers()))
  const { success } = await checkAiRateLimit(rateLimitIdentifier(account.accountId, ip), 'extract')
  if (!success) throw new Error('Too many requests — please wait a few minutes before extracting another brand kit.')
}

export async function extractFromUrl(url: string) {
  if (!url) throw new Error("URL is required")
  if (url.length > MAX_URL_LENGTH) throw new Error("That URL is too long")
  await requireAccountForExtraction()
  const extracted = await extractBrandKitFromUrl(url)
  return extracted
}

export async function extractFromImage(fileData: string) {
  if (!fileData) throw new Error("Image data is required")
  await requireAccountForExtraction()
  const extracted = await extractBrandKitFromImage(fileData)
  return extracted
}

export async function extractFromText(description: string) {
  if (!description || !description.trim()) throw new Error("A description is required")
  if (description.length > MAX_DESCRIPTION_LENGTH) throw new Error(`Keep the description under ${MAX_DESCRIPTION_LENGTH.toLocaleString()} characters`)
  await requireAccountForExtraction()
  const extracted = await extractBrandKitFromText(description.trim())
  return extracted
}

export async function saveBrandKit(data: any) {
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error("Unauthorized")

  // The account_id is inferred securely by RLS and triggers, but we need to supply it if it's not a default?
  // Actually, we can fetch the user's account_id.
  const { data: userRecord } = await supabase
    .from('users')
    .select('account_id')
    .eq('id', userData.user.id)
    .single()

  if (!userRecord?.account_id) throw new Error("Account not found")

  // Returns the inserted row so the caller (e.g. the onboarding wizard) can use the real saved
  // kit immediately, instead of downstream steps having to re-fetch or guess which kit is newest.
  const { data: saved, error } = await supabase
    .from('brand_kits')
    .insert({
      account_id: userRecord.account_id,
      name: data.name,
      source_type: data.source_type,
      source_reference: data.source_reference,
      colors: data.colors,
      fonts: data.fonts,
      logo_url: data.logoUrl,
      personality: data.personality || null,
    })
    .select('id, name, colors, fonts, logo_url')
    .single()

  if (error) {
    logError("Failed to save brand kit", error, { accountId: userRecord.account_id })
    throw new Error("Failed to save brand kit")
  }

  revalidatePath('/dashboard')

  return {
    id: saved.id as string,
    name: (saved.name as string | null) || 'Your brand kit',
    colors: (saved.colors as any) || null,
    fonts: (saved.fonts as any) || null,
    logoUrl: (saved.logo_url as string | null) || null,
  }
}

export async function deleteBrandKit(id: string) {
  if (!id) throw new Error("Brand kit id is required")
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error("Unauthorized")

  const { data: userRecord } = await supabase
    .from('users')
    .select('account_id')
    .eq('id', userData.user.id)
    .single()

  if (!userRecord?.account_id) throw new Error("Account not found")

  // Scoped to the caller's own account, not just the row id — RLS enforces the same boundary,
  // but filtering here too means a foreign id fails the query outright instead of relying on a
  // single layer of defense.
  const { error } = await supabase
    .from('brand_kits')
    .delete()
    .eq('id', id)
    .eq('account_id', userRecord.account_id)

  if (error) {
    logError("Failed to delete brand kit", error, { accountId: userRecord.account_id, brandKitId: id })
    throw new Error("Failed to delete brand kit")
  }

  logAction('delete_brand_kit', userData.user.id, { accountId: userRecord.account_id, brandKitId: id })
  revalidatePath('/dashboard')
}
