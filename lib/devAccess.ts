import { redirect } from 'next/navigation'
import { getAccountContext, type AccountContext } from '@/lib/accountContext'
import { isBetaAiEngineEnabled } from '@/lib/betaFlags'

/** Shared gate for every app/dev/* proof page — login alone was never enough: these pages make
 * real AI generation calls (real API cost) with no other protection, reachable by any
 * authenticated real account that knew or guessed the URL. Reuses the existing beta-engine
 * allowlist rather than a second, narrower one — the real population that should have dev-route
 * access today is the same one being trusted with the beta feature itself, and
 * BETA_AI_ENGINE_ACCOUNT_IDS is empty by default on production, so this blocks every account
 * until explicitly turned on, matching the same safe-by-default behavior as the real beta route
 * (app/api/proposals/[id]/beta-ai-page/route.ts). */
export async function requireDevAccess(): Promise<AccountContext> {
  const account = await getAccountContext()
  if (!account || !isBetaAiEngineEnabled(account.accountId)) {
    redirect('/login')
  }
  return account
}
