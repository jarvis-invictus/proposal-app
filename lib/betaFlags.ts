/** Env-var allowlist, not a DB column — deliberately reversible with no schema change and no
 * migration, for a first, narrow, single-account real-data integration of the new generation
 * engine (docs/CORE_ENGINE_V2_SPEC.md). Unset by default, so this is off for every real account
 * until explicitly turned on. */
export function isBetaAiEngineEnabled(accountId: string | null | undefined): boolean {
  if (!accountId) return false
  const allowlist = (process.env.BETA_AI_ENGINE_ACCOUNT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)
  return allowlist.includes(accountId)
}
