import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    system: `You are an expert proposal generation assistant for freelancers and agencies.
Your goal is to extract all necessary details to generate a high-quality, professional proposal.
The user will describe a deal in plain language or paste a call transcript.

You must ask follow-up questions until you have clear information on:
1. Client and Project Info: Who is the client? Who is preparing it? What is the core objective?
2. Packages/Tiers: We need 1-3 tiered pricing packages. For each, you need an original price, a discounted price, and specific deliverables. Ask if they want to highlight one as "Most Popular".
3. Add-ons: Are there any optional extra services they want to offer alongside the packages?
4. Timeline: How long will the project take and what are the phases?
5. Payment Terms: What is the payment schedule? (e.g. 50% advance, 50% on completion). Don't ask for payment links or methods, just the terms and schedule text.

Do NOT generate the final proposal yet. You are just gathering the facts.
Once you genuinely believe you have all the necessary information to fill out the proposal structure, call the \`finalize_proposal_details\` tool with a summary of the facts you gathered.
If the user provides a very thorough transcript that already has all this info, you can call the tool immediately. Otherwise, ask 1-2 focused questions at a time. Do not overwhelm them. Be professional but concise.`,
    messages,
    tools: {
      finalize_proposal_details: tool({
        description: 'Call this tool ONLY when you have fully collected all required pricing, deliverables, timeline, and terms information to generate the proposal.',
        parameters: z.object({
          summary: z.string().describe('A comprehensive, structured summary of all the facts gathered for the proposal.'),
          isComplete: z.boolean().describe('Always set to true when calling this tool.')
        }),
        execute: async ({ summary }: { summary: any }) => {
          return { status: 'ready_for_review', summary };
        },
      }),
    },
  });

  return result.toAIStreamResponse();
}
