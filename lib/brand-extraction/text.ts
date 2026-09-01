import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

export async function extractBrandKitFromText(description: string) {
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      colors: z.object({
        primary: z.string().describe('Primary brand color in hex format (e.g. #000000)'),
        secondary: z.string().describe('Secondary brand color in hex format'),
        accent: z.string().describe('Accent color in hex format'),
        background: z.string().describe('Typical page background color in hex format'),
        text: z.string().describe('Typical text color in hex format'),
      }),
      fonts: z.object({
        heading: z.string().describe("The name of a real font family that fits this description's style (e.g., 'Inter, sans-serif' or 'Georgia, serif')"),
        body: z.string().describe('The name of a real font family for body text that pairs well with the heading font'),
      }),
    }),
    prompt: `A user is describing their brand's look and feel in their own words, so we can build a starting brand kit for them. Translate the description into a concrete, tasteful set of hex colors and font pairings — make real, specific choices rather than generic defaults, and keep the palette coherent as a set.

Brand description:
${description}`,
  })

  return object
}
