import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

export async function extractBrandKitFromImage(imageUrl: string | Uint8Array) {
  // If it's a URL, we pass the URL. If it's a Uint8Array, we convert to buffer or base64.
  // Assuming Vercel AI SDK can handle data URLs or direct buffers for OpenAI.
  // The user uploads an image, we can convert it to a data URL before calling this.
  
  let imagePart: { type: 'image', image: string | Uint8Array }

  if (typeof imageUrl === 'string') {
    // URL or Data URL
    imagePart = { type: 'image', image: imageUrl }
  } else {
    // Buffer/Uint8Array
    imagePart = { type: 'image', image: imageUrl }
  }

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      colors: z.object({
        primary: z.string().describe("Primary brand color in hex format (e.g. #000000)"),
        secondary: z.string().describe("Secondary brand color in hex format"),
        accent: z.string().describe("Accent color in hex format"),
        background: z.string().describe("Typical page background color in hex format"),
        text: z.string().describe("Typical text color in hex format"),
      }),
      fonts: z.object({
        heading: z.string().describe("The name of the font family used for headings. Guess based on visual style (e.g., 'Inter, sans-serif' or 'Georgia, serif')"),
        body: z.string().describe("The name of the font family used for body text. Guess based on visual style."),
      }),
    }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the brand kit (colors and fonts) from this image. Do your best to identify the primary visual colors and the style of typography.' },
          imagePart,
        ],
      },
    ],
  })

  return object
}
