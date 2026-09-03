'use server'

import { extractBrandKitFromUrl } from '@/lib/brand-extraction/url'
import { extractBrandKitFromImage } from '@/lib/brand-extraction/vision'
import { extractBrandKitFromText } from '@/lib/brand-extraction/text'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function extractFromUrl(url: string) {
  if (!url) throw new Error("URL is required")
  const extracted = await extractBrandKitFromUrl(url)
  return extracted
}

export async function extractFromImage(fileData: string) {
  if (!fileData) throw new Error("Image data is required")
  const extracted = await extractBrandKitFromImage(fileData)
  return extracted
}

export async function extractFromText(description: string) {
  if (!description || !description.trim()) throw new Error("A description is required")
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
    console.error("Failed to save brand kit", error)
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
    console.error("Failed to delete brand kit", error)
    throw new Error("Failed to delete brand kit")
  }

  revalidatePath('/dashboard')
}
