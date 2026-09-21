import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { generateObject, generateText, LoadAPIKeyError } from 'ai'
import type { ZodType } from 'zod'
import { getStageConfig, type StageProvider } from '@/lib/ai/stageConfig'
import { logAiProvider, logError } from '@/lib/logging'

function resolveModel(provider: StageProvider, model: string) {
  return provider === 'anthropic' ? anthropic(model) : openai(model)
}

/** `ANTHROPIC_API_KEY` is deliberately unset in production (Sahil's own call, Anthropic API
 * budget — confirmed 2026-09-20, not a misconfiguration to fix) — every primary attempt fails
 * this way, on purpose, and always will until that changes. Routes that through a distinct,
 * expected-outcome log line instead of `logError`'s error-level path, so this known, intentional
 * gap can never again be mistaken for (or bury) a genuine Claude API failure — a real auth/rate
 * limit/timeout error still goes through `logError` below, unchanged. */
function logPrimarySkippedOrFailed(stage: string, provider: StageProvider, model: string, primaryError: unknown) {
  if (LoadAPIKeyError.isLoadAPIKeyError(primaryError)) {
    console.log(`[ai-harness] ${stage} primary skipped — no API key configured for ${provider} (expected, not an error)`)
    return
  }
  // Structured, not just the raw error object — a viewer scanning Vercel's function logs or
  // Sentry (once NEXT_PUBLIC_SENTRY_DSN is actually set, see sentry.server.config.ts) can see
  // errorName/errorMessage directly without expanding a stack trace.
  logError(`[ai-harness] ${stage} primary failed, retrying fallback`, primaryError, {
    provider,
    model,
    errorName: primaryError instanceof Error ? primaryError.name : typeof primaryError,
    errorMessage: primaryError instanceof Error ? primaryError.message : String(primaryError),
  })
}

/** Runs one pipeline stage through the Claude-primary/OpenAI-fallback harness
 * (docs/CORE_ENGINE_V2_SPEC.md §3) — new generation-engine stage calls go through this, never a
 * provider SDK directly inline in a route file. Retries once against the fallback on primary
 * failure, and logs which provider actually served the request. */
export async function runStage<T>(
  stage: string,
  opts: { schema: ZodType<T>; prompt: string; maxOutputTokens?: number }
): Promise<{ object: T; provider: StageProvider; model: string; usedFallback: boolean }> {
  const config = getStageConfig(stage)
  const maxTokens = opts.maxOutputTokens ?? 1000

  try {
    const { object } = await generateObject({
      model: resolveModel(config.primary.provider, config.primary.model),
      schema: opts.schema,
      prompt: opts.prompt,
      maxTokens,
    })
    logAiProvider(stage, config.primary.provider, config.primary.model, false)
    return { object, provider: config.primary.provider, model: config.primary.model, usedFallback: false }
  } catch (primaryError) {
    logPrimarySkippedOrFailed(stage, config.primary.provider, config.primary.model, primaryError)

    const { object } = await generateObject({
      model: resolveModel(config.fallback.provider, config.fallback.model),
      schema: opts.schema,
      prompt: opts.prompt,
      maxTokens,
    })
    logAiProvider(stage, config.fallback.provider, config.fallback.model, true)
    return { object, provider: config.fallback.provider, model: config.fallback.model, usedFallback: true }
  }
}

export type StageTextUsage = { promptTokens: number; completionTokens: number }

/** Same harness, for stages whose output is long free-form text (e.g. a full generated HTML
 * page) rather than a small structured object — `generateText` is the right primitive here, not
 * `generateObject` against an unwieldy single-giant-string schema. Returns real `usage` figures
 * straight from the AI SDK's own result (not an estimate) — needed to report actual token/cost
 * numbers for revision rounds, where a full prior-HTML context makes prompt size worth watching. */
export async function runStageText(
  stage: string,
  opts: { prompt: string; maxOutputTokens?: number }
): Promise<{ text: string; provider: StageProvider; model: string; usedFallback: boolean; usage: StageTextUsage }> {
  const config = getStageConfig(stage)
  const maxTokens = opts.maxOutputTokens ?? 1000

  try {
    const { text, usage } = await generateText({
      model: resolveModel(config.primary.provider, config.primary.model),
      prompt: opts.prompt,
      maxTokens,
    })
    logAiProvider(stage, config.primary.provider, config.primary.model, false)
    return { text, provider: config.primary.provider, model: config.primary.model, usedFallback: false, usage }
  } catch (primaryError) {
    logPrimarySkippedOrFailed(stage, config.primary.provider, config.primary.model, primaryError)

    const { text, usage } = await generateText({
      model: resolveModel(config.fallback.provider, config.fallback.model),
      prompt: opts.prompt,
      maxTokens,
    })
    logAiProvider(stage, config.fallback.provider, config.fallback.model, true)
    return { text, provider: config.fallback.provider, model: config.fallback.model, usedFallback: true, usage }
  }
}
