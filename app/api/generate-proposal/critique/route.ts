import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { AI_MODEL } from '@/lib/generation/model';
import { getAccountContext } from '@/lib/accountContext';
import { checkAiRateLimit, extractClientIp, rateLimitIdentifier } from '@/lib/ratelimit';
import { CritiqueSchema, type CritiqueIssue } from '@/lib/generation/critique';
import { findCrutchPhrases } from '@/lib/generation/specificity';
import { logError } from '@/lib/logging';
import { resolveBrandKit } from '@/lib/brand-extraction/prompt';
import { paperContrast } from '@/lib/color';
import { findStalePriceMentions } from '@/lib/generation/pricing';

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

  const { summary, proposal, brandKitId } = await req.json();
  if (!summary || !proposal) {
    return new Response(JSON.stringify({ error: 'Missing summary or proposal' }), { status: 400 });
  }

  // Crutch-phrase findings are mechanical (a grep, not another LLM judgment call that could fail
  // the same way it's meant to catch), so they're unconditional — populated before the LLM pass
  // even runs, and they survive if that pass errors out below.
  let issues: CritiqueIssue[] = findCrutchPhrases(proposal).map(({ field, phrase }) => ({
    field,
    severity: 'medium' as const,
    note: `Reads as generic AI phrasing ("${phrase}") — worth rewriting with something specific to this deal.`,
  }));

  // Same "mechanical, not another LLM guess" principle as the crutch-phrase check above — a
  // hand-typed dollar figure in terms/payment prose has no code path that ever reconciles it
  // against packages[]/addOns[] pricing, so catching drift here is the only backstop.
  issues.push(...findStalePriceMentions(proposal).map(({ field, note }) => ({
    field, severity: 'medium' as const, note,
  })));

  // Same WCAG contrast math ThemeColorPicker already uses to warn interactively while picking a
  // color — applied automatically here to whatever the generated document will actually render
  // with, since a free-form layout has no editor step where a human would otherwise catch this.
  if (proposal.layout && Array.isArray(proposal.layout) && proposal.layout.length > 0) {
    const brandKit = await resolveBrandKit(account?.accountId ?? null, brandKitId ?? null);
    const themeColor = proposal.themeColor || brandKit?.colors?.primary || '#4F46E5';
    const check = paperContrast(themeColor);
    if (check.tone === 'warn') {
      issues.push({
        field: 'layout',
        severity: 'medium',
        note: `${check.text} — the theme color (${themeColor}) may be hard to read on the white document background.`,
      });
    }
  }

  // Advisory only — a failed or rate-limited critique call must never surface as an error the
  // user has to deal with; it just means no additional LLM findings show, the mechanical ones above still do.
  try {
    const { object: critique } = await generateObject({
      model: openai(AI_MODEL),
      schema: CritiqueSchema,
      prompt: `Review this drafted proposal for anything a professional would want to double-check before sending — unrealistic or ungrounded pricing (a figure not supported by the summary), inconsistent tone across sections, or information that feels missing relative to what was discussed. If the proposal includes a \`layout\` field, also assess: does the section order and choice of primitives look genuinely tailored to this deal, or could this exact structure have been produced for any client (genericness/templated-feel)? Does it actually reflect the brand context given (not just brand-neutral defaults)? Is there real visual variety across sections (not every section using the same primitive), and does every section earn its place? Flag concerns only, do not rewrite anything.

dateIssued and validUntil are already computed correctly by the app (today's date, and 14 days out) — do not flag them as suspicious just for being in the future.

Original Deal Facts Summary:
${summary}

Drafted Proposal:
${JSON.stringify(proposal)}`,
      maxTokens: 1000,
      abortSignal: AbortSignal.timeout(20_000),
    });
    issues = [...issues, ...critique.issues];
  } catch (err) {
    logError('Critique pass failed, continuing without it:', err, { accountId: account?.accountId ?? null });
  }
  return new Response(JSON.stringify({ issues }), { status: 200 });
}
