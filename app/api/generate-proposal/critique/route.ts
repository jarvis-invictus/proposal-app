import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { AI_MODEL } from '@/lib/generation/model';
import { getAccountContext } from '@/lib/accountContext';
import { checkAiRateLimit, extractClientIp, rateLimitIdentifier } from '@/lib/ratelimit';
import { CritiqueSchema } from '@/lib/generation/critique';

export const maxDuration = 30;

// Split out of /api/generate-proposal so critique — advisory-only, never blocking by design —
// no longer runs sequentially inside the same request as the four (much more expensive) drafting
// calls. The client fires this concurrently with saving the draft instead of waiting on it before
// the user ever sees their proposal.
export async function POST(req: Request) {
  const account = await getAccountContext();
  const ip = extractClientIp(req);
  const { success } = await checkAiRateLimit(rateLimitIdentifier(account?.accountId ?? null, ip), 'generate');
  if (!success) {
    return new Response(JSON.stringify({ issues: [] }), { status: 200 });
  }

  const { summary, proposal } = await req.json();
  if (!summary || !proposal) {
    return new Response(JSON.stringify({ error: 'Missing summary or proposal' }), { status: 400 });
  }

  // Advisory only — a failed or rate-limited critique call must never surface as an error the
  // user has to deal with; it just means no review banner shows.
  try {
    const { object: critique } = await generateObject({
      model: openai(AI_MODEL),
      schema: CritiqueSchema,
      prompt: `Review this drafted proposal for anything a professional would want to double-check before sending — unrealistic or ungrounded pricing (a figure not supported by the summary), inconsistent tone across sections, or information that feels missing relative to what was discussed. Flag concerns only, do not rewrite anything.

dateIssued and validUntil are already computed correctly by the app (today's date, and 14 days out) — do not flag them as suspicious just for being in the future.

Original Deal Facts Summary:
${summary}

Drafted Proposal:
${JSON.stringify(proposal)}`,
      maxTokens: 1000,
      abortSignal: AbortSignal.timeout(20_000),
    });
    return new Response(JSON.stringify({ issues: critique.issues }), { status: 200 });
  } catch (err) {
    console.error('Critique pass failed, continuing without it:', err);
    return new Response(JSON.stringify({ issues: [] }), { status: 200 });
  }
}
