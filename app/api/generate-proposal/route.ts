import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { ProposalSchemaV1 } from '@/lib/schema/proposal';
import { getAccountContext } from '@/lib/accountContext';
import { currencyPromptInstruction } from '@/lib/accountCurrency';
import { checkAiRateLimit, extractClientIp, rateLimitIdentifier } from '@/lib/ratelimit';
import { resolveBrandKit, brandContextBlock } from '@/lib/brand-extraction/prompt';
import { styleReferenceBlock, briefBlock } from '@/lib/generation/promptBlocks';
import { correctPricing } from '@/lib/generation/pricing';
import { CritiqueSchema, type CritiqueIssue } from '@/lib/generation/critique';

export const maxDuration = 60;

// Section-by-section drafting instead of one combined call — each piece can be prompted,
// evaluated, and retried independently, and none of them need a new AI schema shape, just a
// narrower view of the existing one.
const HeaderSchema = ProposalSchemaV1.pick({ title: true, clientName: true, preparedFor: true, preparedBy: true });
const PackagesSchema = ProposalSchemaV1.pick({ packages: true, addOns: true });
const TimelineSchema = ProposalSchemaV1.pick({ timeline: true });
const TermsSchema = ProposalSchemaV1.pick({ terms: true, paymentSection: true });

export async function POST(req: Request) {
  const account = await getAccountContext();
  const ip = extractClientIp(req);
  const { success } = await checkAiRateLimit(rateLimitIdentifier(account?.accountId ?? null, ip), 'generate');
  if (!success) {
    return new Response(JSON.stringify({ error: 'Too many requests — please wait a few minutes before generating another proposal.' }), { status: 429 });
  }

  const { summary, styleReference, brief, brandKitId } = await req.json();

  if (!summary) {
    return new Response(JSON.stringify({ error: 'Missing summary' }), { status: 400 });
  }
  // Deal-facts summaries (often a pasted call transcript) legitimately run long, so this cap is
  // generous — it exists to put a ceiling on cost from an unbounded paste, not to constrain a
  // normal one. styleReference/brief are always short by design, so a much tighter cap there.
  if (summary.length > 20_000) {
    return new Response(JSON.stringify({ error: 'That summary is too long — keep it under 20,000 characters.' }), { status: 400 });
  }
  if (typeof styleReference === 'string' && styleReference.length > 5_000) {
    return new Response(JSON.stringify({ error: 'That style reference is too long — keep it under 5,000 characters.' }), { status: 400 });
  }
  if (typeof brief === 'string' && brief.length > 5_000) {
    return new Response(JSON.stringify({ error: 'That brief is too long — keep it under 5,000 characters.' }), { status: 400 });
  }

  try {
    const today = new Date();
    const defaultValidUntil = new Date(today);
    defaultValidUntil.setDate(today.getDate() + 14);
    const currency = account?.currency || 'USD';
    const brandKit = await resolveBrandKit(account?.accountId ?? null, brandKitId);

    // Shared across every drafting call below so tone/brand/style stay consistent between
    // sections that are otherwise generated independently and can't see each other's output.
    const contextBlock = `${styleReferenceBlock(styleReference)}${briefBlock(brief)}${brandContextBlock(brandKit)}`;
    const buildPrompt = (sectionLabel: string, instructions: string) => `You are a professional proposal generation engine, drafting the "${sectionLabel}" section of a larger document. Stay consistent in tone with the rest of the proposal even though you can't see it directly — it's drafted from the same facts below.

CURRENCY (critical): ${currencyPromptInstruction(currency)}

SPECIFICITY (critical): every sentence must earn its place by referencing something real from the deal facts below — a deliverable, a number, a named phase, the client's actual situation. Do not write filler that could apply to any project ("we look forward to partnering with you," "our team is excited to bring your vision to life," "a solution tailored to your needs"). If a brand voice is given below, that voice should be audible in the word choice, not just mentioned — write the way that business would actually talk to this client, not a generic proposal template with their name inserted.

${instructions}

Deal Facts Summary:
${summary}
${contextBlock}`;

    // Each call gets its own bounded timeout, well under the 60s function budget — with four
    // running in parallel, one hung call previously risked pinning the whole request until
    // Vercel's hard kill, surfacing a raw platform timeout instead of a handled error.
    const SECTION_TIMEOUT_MS = 40_000;
    const [headerResult, packagesResult, timelineResult, termsResult] = await Promise.all([
      generateObject({
        model: openai('gpt-4o'),
        schema: HeaderSchema,
        prompt: buildPrompt('header', 'Write a compelling title, and correctly identify the client, the specific person/team the proposal is prepared for, and who is preparing it.'),
        maxTokens: 1000,
        abortSignal: AbortSignal.timeout(SECTION_TIMEOUT_MS),
      }),
      generateObject({
        model: openai('gpt-4o'),
        schema: PackagesSchema,
        prompt: buildPrompt('packages and add-ons', `- Typically 2-3 packages, unless the summary clearly calls for a different count.
- Make sure originalPrice is higher than discountedPrice if both exist.
- Ensure description text sounds professional and persuasive.`),
        maxTokens: 3000,
        abortSignal: AbortSignal.timeout(SECTION_TIMEOUT_MS),
      }),
      generateObject({
        model: openai('gpt-4o'),
        schema: TimelineSchema,
        prompt: buildPrompt('timeline', 'Break the project into clear phases with realistic durations based on the summary.'),
        maxTokens: 2000,
        abortSignal: AbortSignal.timeout(SECTION_TIMEOUT_MS),
      }),
      generateObject({
        model: openai('gpt-4o'),
        schema: TermsSchema,
        prompt: buildPrompt('terms and payment', 'Keep terms standard and concise unless specified otherwise in the summary. Do not include payment methods like UPI/Stripe in paymentSection — schedule and text terms only.'),
        maxTokens: 1500,
        abortSignal: AbortSignal.timeout(SECTION_TIMEOUT_MS),
      }),
    ]);

    // Dates aren't a drafting decision — assembled directly rather than left to model
    // consistency across a call that no longer sees them at all.
    const draft = {
      ...headerResult.object,
      dateIssued: today.toLocaleDateString(),
      validUntil: defaultValidUntil.toLocaleDateString(),
      ...packagesResult.object,
      ...timelineResult.object,
      ...termsResult.object,
    };

    const corrected = correctPricing(draft);

    // Critique is advisory only — flag, never block, and never let a failed critique call take
    // down an otherwise-successful generation.
    let critiqueIssues: CritiqueIssue[] = [];
    try {
      const { object: critique } = await generateObject({
        model: openai('gpt-4o'),
        schema: CritiqueSchema,
        prompt: `Review this drafted proposal for anything a professional would want to double-check before sending — unrealistic or ungrounded pricing (a figure not supported by the summary), inconsistent tone across sections, or information that feels missing relative to what was discussed. Flag concerns only, do not rewrite anything.

dateIssued and validUntil are already computed correctly by the app (today's date, and 14 days out) — do not flag them as suspicious just for being in the future.

Original Deal Facts Summary:
${summary}

Drafted Proposal:
${JSON.stringify(corrected)}`,
        maxTokens: 1000,
        abortSignal: AbortSignal.timeout(15_000),
      });
      critiqueIssues = critique.issues;
    } catch (err) {
      console.error('Critique pass failed, continuing without it:', err);
    }

    // _critique rides alongside the real content but is never persisted — NewProposalClient
    // strips it before saving and stashes it transiently for the Editor to show once.
    return new Response(JSON.stringify({ ...corrected, _critique: critiqueIssues.length ? critiqueIssues : undefined }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to generate proposal:', error);
    return new Response(JSON.stringify({ error: 'Generation failed' }), { status: 500 });
  }
}
