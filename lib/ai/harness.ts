import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import type { ZodType } from 'zod'
import { getStageConfig, type StageProvider } from '@/lib/ai/stageConfig'
import { logAiProvider, logError } from '@/lib/logging'

function resolveModel(provider: StageProvider, model: string) {
  return provider === 'anthropic' ? anthropic(model) : openai(model)
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
    logError(`[ai-harness] ${stage} primary failed, retrying fallback`, primaryError, {
      provider: config.primary.provider,
      model: config.primary.model,
    })

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

/** Same harness, for stages whose output is long free-form text (e.g. a full generated HTML
 * page) rather than a small structured object — `generateText` is the right primitive here, not
 * `generateObject` against an unwieldy single-giant-string schema. */
export async function runStageText(
  stage: string,
  opts: { prompt: string; maxOutputTokens?: number }
): Promise<{ text: string; provider: StageProvider; model: string; usedFallback: boolean }> {
  const config = getStageConfig(stage)
  const maxTokens = opts.maxOutputTokens ?? 1000

  try {
    const { text } = await generateText({
      model: resolveModel(config.primary.provider, config.primary.model),
      prompt: opts.prompt,
      maxTokens,
    })
    logAiProvider(stage, config.primary.provider, config.primary.model, false)
    return { text, provider: config.primary.provider, model: config.primary.model, usedFallback: false }
  } catch (primaryError) {
    logError(`[ai-harness] ${stage} primary failed, retrying fallback`, primaryError, {
      provider: config.primary.provider,
      model: config.primary.model,
    })

    const { text } = await generateText({
      model: resolveModel(config.fallback.provider, config.fallback.model),
      prompt: opts.prompt,
      maxTokens,
    })
    logAiProvider(stage, config.fallback.provider, config.fallback.model, true)
    return { text, provider: config.fallback.provider, model: config.fallback.model, usedFallback: true }
  }
}
