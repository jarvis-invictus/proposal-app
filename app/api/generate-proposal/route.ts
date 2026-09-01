import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { ProposalSchemaV1 } from '@/lib/schema/proposal';
import { getAccountCurrency, currencyPromptInstruction } from '@/lib/accountCurrency';
import { checkAiRateLimit, extractClientIp } from '@/lib/ratelimit';

export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = extractClientIp(req);
  const { success } = await checkAiRateLimit(ip);
  if (!success) {
    return new Response(JSON.stringify({ error: 'Too many requests — please wait a few minutes before generating another proposal.' }), { status: 429 });
  }

  const { summary } = await req.json();

  if (!summary) {
    return new Response(JSON.stringify({ error: 'Missing summary' }), { status: 400 });
  }

  try {
    const today = new Date();
    const defaultValidUntil = new Date(today);
    defaultValidUntil.setDate(today.getDate() + 14);
    const currency = await getAccountCurrency();

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: ProposalSchemaV1,
      prompt: `You are a professional proposal generation engine.
Below is a summary of facts gathered from the user about a prospective deal.
Your task is to populate the ProposalSchemaV1 with this data.

CURRENCY (critical): ${currencyPromptInstruction(currency)}

Requirements:
- Make sure originalPrice is higher than discountedPrice if both exist.
- Ensure the description text sounds professional and persuasive.
- Keep terms standard and concise unless specified otherwise in the summary.
- Fill out all required schema fields accurately based on the facts provided.
- If the issue date is not explicitly provided, default to today's date: ${today.toLocaleDateString()}.
- If the valid until date is not explicitly provided, default to 14 days from today: ${defaultValidUntil.toLocaleDateString()}.

Deal Facts Summary:
${summary}
`,
    });

    return new Response(JSON.stringify(object), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to generate proposal:', error);
    return new Response(JSON.stringify({ error: 'Generation failed' }), { status: 500 });
  }
}
