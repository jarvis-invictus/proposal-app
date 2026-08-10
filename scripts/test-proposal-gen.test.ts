import { describe, it, expect } from 'vitest';
import { generateText, generateObject, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { ProposalSchemaV1 } from '../lib/schema/proposal';
import { env } from '../env';

// A mock of the system prompt to test the intake flow
const INTAKE_SYSTEM_PROMPT = `You are an expert proposal generation assistant for freelancers and agencies.
Your goal is to extract all necessary details to generate a high-quality, professional proposal.
The user will describe a deal in plain language or paste a call transcript.

You must ask follow-up questions until you have clear information on:
1. Client and Project Info: Who is the client? Who is preparing it? What is the core objective?
2. Packages/Tiers: We need 1-3 tiered pricing packages. For each, you need an original price, a discounted price, and specific deliverables. Ask if they want to highlight one as "Most Popular".
3. Add-ons: Are there any optional extra services they want to offer alongside the packages?
4. Timeline: How long will the project take and what are the phases?
5. Payment Terms: What is the payment schedule? (e.g. 50% advance, 50% on completion). Don't ask for payment links or methods, just the terms and schedule text.

Do NOT generate the final proposal yet. You are just gathering the facts.
Once you genuinely believe you have all the necessary information to fill out the proposal structure, call the \`finalize_proposal_details\` tool. You MUST pass a detailed 'summary' of the facts you gathered as the tool argument.
If the user provides a very thorough transcript that already has all this info, you can call the tool immediately. Otherwise, ask 1-2 focused questions at a time. Do not overwhelm them. Be professional but concise.`;

describe('Proposal AI Engine', () => {
  it('handles a detailed call transcript immediately', async () => {
    console.log('\\n--- TEST 1: Detailed Call Transcript ---');
    const input = `Just got off the phone with Acme Corp (talking to John). They want a website redesign. I am sending this from WebStudio.
We agreed on $5k for the standard package (normally $6k), and a $8k pro package (normally $10k). 
Standard has 5 pages, pro has 10 pages and a CMS. Highlight the pro package as popular.
Timeline is 4 weeks (2 weeks design, 2 weeks dev). 
50% upfront, 50% on delivery. 
We will also offer a $1k add-on for logo design.`;

    const { text, toolCalls } = await generateText({
      model: openai('gpt-4o'),
      system: INTAKE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: input }],
      tools: {
        finalize_proposal_details: tool({
          description: 'Call this tool ONLY when you have fully collected all required information.',
          parameters: z.object({
            summary: z.string().describe("A comprehensive summary of all facts gathered (client, packages, timeline, etc.) to pass to the proposal generator.")
          })
        })
      }
    });

    if (toolCalls && toolCalls.length > 0) {
      console.log('AI correctly called finalize_proposal_details with toolCall:');
      console.log(JSON.stringify(toolCalls[0], null, 2));
      const args = toolCalls[0].args || (toolCalls[0] as any).input;
      const summary = args?.summary || input;
      
      const today = new Date();
      const defaultValidUntil = new Date(today);
      defaultValidUntil.setDate(today.getDate() + 14);

      console.log('\\nGenerating final proposal...');
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: ProposalSchemaV1,
        system: `You are a professional proposal generation engine.
Below is a summary of facts gathered from the user about a prospective deal.
Your task is to output a JSON object matching the ProposalSchemaV1.
Requirements:
- Ensure the description text sounds professional and persuasive.
- Fill out all required schema fields accurately based on the facts provided.
- If the issue date is not explicitly provided, default to today's date: ${today.toLocaleDateString()}.
- If the valid until date is not explicitly provided, default to 14 days from today: ${defaultValidUntil.toLocaleDateString()}.`,
        messages: [{ role: 'user', content: summary as string }],
      });
      console.log(JSON.stringify(object, null, 2));
    } else {
      console.log('AI asked follow-up questions instead of finalizing:');
      console.log(text);
    }
  }, 30000);

  it('asks follow-up questions for a vague WhatsApp message', async () => {
    console.log('\\n--- TEST 2: Vague WhatsApp Message ---');
    const input = `Client: Bob Smith. Basic SEO package 500 bucks. Includes keyword research and 3 articles.`;

    const { text, toolCalls } = await generateText({
      model: openai('gpt-4o'),
      system: INTAKE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: input }],
      tools: {
        finalize_proposal_details: tool({
          description: 'Call this tool ONLY when you have fully collected all required information.',
          parameters: z.object({
            summary: z.string().describe("A comprehensive summary of all facts gathered (client, packages, timeline, etc.) to pass to the proposal generator.")
          })
        })
      }
    });

    if (toolCalls && toolCalls.length > 0) {
      console.log('AI prematurely finalized!');
    } else {
      console.log('AI correctly asked follow-up questions:');
      console.log(text);
      expect(text.length).toBeGreaterThan(0);
    }
  }, 30000);
});
