/** Single source of truth for which OpenAI model every AI call in the app uses — was hardcoded
 * inline at all 9 call sites, so changing or deprecating the model meant editing every one of
 * them individually and risking one getting missed. */
export const AI_MODEL = 'gpt-4o'
