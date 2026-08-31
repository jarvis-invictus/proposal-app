import { createBrowserClient } from '@supabase/ssr'

// Reads process.env directly (Next.js inlines NEXT_PUBLIC_* vars into the browser bundle at
// build time) rather than going through '@/env', whose schema also requires server-only
// secrets that don't exist in the browser and would fail validation here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
