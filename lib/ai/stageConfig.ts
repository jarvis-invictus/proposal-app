/** Single config source for the Claude-primary/OpenAI-fallback harness (docs/CORE_ENGINE_V2_SPEC.md
 * §3) — swapping a stage's model is a one-line env var change here, never a multi-file edit. */

export type StageProvider = 'anthropic' | 'openai'

export type StageConfig = {
  primary: { provider: StageProvider; model: string }
  fallback: { provider: StageProvider; model: string }
}

const STAGES: Record<string, StageConfig> = {
  'harness-check': {
    primary: { provider: 'anthropic', model: process.env.HARNESS_CHECK_PRIMARY_MODEL || 'claude-sonnet-5' },
    fallback: { provider: 'openai', model: process.env.HARNESS_CHECK_FALLBACK_MODEL || 'gpt-4o' },
  },
  'codegen': {
    primary: { provider: 'anthropic', model: process.env.CODEGEN_PRIMARY_MODEL || 'claude-sonnet-5' },
    fallback: { provider: 'openai', model: process.env.CODEGEN_FALLBACK_MODEL || 'gpt-4o' },
  },
  'revise': {
    primary: { provider: 'anthropic', model: process.env.REVISE_PRIMARY_MODEL || 'claude-sonnet-5' },
    fallback: { provider: 'openai', model: process.env.REVISE_FALLBACK_MODEL || 'gpt-4o' },
  },
}

export function getStageConfig(stage: string): StageConfig {
  const config = STAGES[stage]
  if (!config) throw new Error(`No harness config for stage "${stage}"`)
  return config
}
