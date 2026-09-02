import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getAccountContext } from '@/lib/accountContext';
import { currencyPromptInstruction } from '@/lib/accountCurrency';
import { currencySymbol } from '@/lib/formatCurrency';
import { checkAiRateLimit, extractClientIp, rateLimitIdentifier } from '@/lib/ratelimit';
import { resolveBrandKit, brandContextBlock } from '@/lib/brand-extraction/prompt';
import { styleReferenceBlock } from '@/lib/generation/promptBlocks';

export const maxDuration = 30;

export async function POST(req: Request) {
  const account = await getAccountContext();
  const ip = extractClientIp(req);
  const { success } = await checkAiRateLimit(rateLimitIdentifier(account?.accountId ?? null, ip), 'chat');
  if (!success) {
    return new Response(JSON.stringify({ error: 'Too many requests — please wait a few minutes before continuing.' }), { status: 429 });
  }

  const { messages, styleReference, brandKitId } = await req.json();
  const currency = account?.currency || 'USD';
  const symbol = currencySymbol(currency);
  const brandKit = await resolveBrandKit(account?.accountId ?? null, brandKitId);

  const result = await streamText({
    model: openai('gpt-4o'),
    system: `You are an expert proposal generation assistant for freelancers and agencies.
Your goal is to extract all necessary details to generate a high-quality, professional proposal.
The user will describe a deal in plain language or paste a call transcript.

${currencyPromptInstruction(currency)} When you ask about or restate prices in conversation (not just in the final tool call), use the ${currency} symbol (${symbol}), not $, unless the user has already stated a figure in a different currency themselves.

You must ask follow-up questions until you have clear information on:
1. Client and Project Info: Who is the client? Who is preparing it? What is the core objective?
2. Packages/Tiers: We need 1-3 tiered pricing packages. For each, you need an original price, a discounted price, and specific deliverables. Ask if they want to highlight one as "Most Popular".
3. Add-ons: Are there any optional extra services they want to offer alongside the packages?
4. Timeline: How long will the project take and what are the phases?
5. Payment Terms: What is the payment schedule? (e.g. 50% advance, 50% on completion). Don't ask for payment links or methods, just the terms and schedule text.

Do NOT generate the final proposal yet. You are just gathering the facts.
Once you genuinely believe you have all the necessary information to fill out the proposal structure, call the \`finalize_proposal_details\` tool with a summary of the facts you gathered, plus a short structured preview.
If the user provides a very thorough transcript that already has all this info, you can call the tool immediately. Otherwise, ask 1-2 focused questions at a time. Do not overwhelm them. Be professional but concise.
When you call finalize_proposal_details, fill in the \`preview\` object with short, honest values drawn only from what the user actually told you — never invent a figure, name, or term they did not provide.${styleReferenceBlock(styleReference)}${brandContextBlock(brandKit)}`,
    messages,
    tools: {
      finalize_proposal_details: tool({
        description: 'Call this tool ONLY when you have fully collected all required pricing, deliverables, timeline, and terms information to generate the proposal.',
        parameters: z.object({
          summary: z.string().describe('A comprehensive, structured summary of all the facts gathered for the proposal. This is what actually gets used to generate the full proposal document.'),
          preview: z.object({
            clientName: z.string().describe('The client or company name this proposal is for.'),
            packageCount: z.number().int().min(1).max(3).describe('How many pricing tiers/packages were discussed (1-3).'),
            priceRange: z.string().describe(`A short price summary the user will recognize, in ${currency} (symbol: ${symbol}), e.g. "${symbol}32,000 - ${symbol}50,000" for two tiers or "${symbol}12,000" for one flat price. Use only figures the user actually gave you.`),
            timeline: z.string().describe('A short timeline summary, e.g. "12 weeks" or "3 months".'),
            terms: z.string().describe('One short phrase for the most important protective term discussed, e.g. "Two rounds of revisions per milestone." If nothing specific was discussed, say "Standard terms".'),
            paymentSchedule: z.string().describe('One short phrase for how payment is split, e.g. "50% upfront, 50% on delivery".'),
          }).describe('A short, honest structured preview of the deal, shown to the user before generating the full document.'),
          isComplete: z.boolean().describe('Always set to true when calling this tool.')
        }),
        execute: async ({ summary, preview }: { summary: any; preview: any }) => {
          return { status: 'ready_for_review', summary, preview };
        },
      }),
    },
  });

  return result.toAIStreamResponse();
}
