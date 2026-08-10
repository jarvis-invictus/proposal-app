import { z } from 'zod';

export const ProposalSchemaV1 = z.object({
  title: z.string().describe("The main title of the proposal, e.g., 'Website Redesign for Acme Corp'"),
  clientName: z.string().describe("The name of the client company or individual"),
  preparedFor: z.string().describe("The specific person the proposal is addressed to"),
  preparedBy: z.string().describe("The name of the agency or freelancer sending the proposal"),
  dateIssued: z.string().describe("The date the proposal was issued, e.g. 'October 24, 2024'"),
  validUntil: z.string().describe("The expiration date of the proposal, typically 14-30 days after issuance"),
  
  packages: z.array(
    z.object({
      name: z.string().describe("Name of the tier/package, e.g., 'Core', 'Pro', 'Enterprise'"),
      description: z.string().describe("A brief summary of who this package is best for"),
      originalPrice: z.number().describe("The higher, un-discounted price (will be shown crossed out)"),
      discountedPrice: z.number().describe("The actual selling price after discount"),
      popular: z.boolean().describe("Whether this package is highlighted as the 'Most Popular' choice"),
      deliverables: z.array(z.string()).describe("A checklist of specific deliverables included in this package")
    })
  ).describe("The core tiered packages being offered. Typically 2-3 options."),

  addOns: z.array(
    z.object({
      name: z.string().describe("Name of the add-on service"),
      description: z.string().describe("Description of the add-on"),
      price: z.number().describe("Price of the add-on"),
      deliverables: z.array(z.string()).describe("Specific deliverables for this add-on")
    })
  ).describe("Optional modular services that can be added alongside a package"),

  timeline: z.array(
    z.object({
      phase: z.string().describe("Name of the phase, e.g., 'Discovery', 'Execution'"),
      duration: z.string().describe("How long this phase takes, e.g., '2 weeks'"),
      description: z.string().describe("What happens during this phase")
    })
  ).describe("The project timeline divided into phases"),

  terms: z.array(z.string()).describe("Standard contract terms or conditions, e.g., 'Revisions beyond 2 rounds billed hourly'"),
  
  paymentSection: z.object({
    schedule: z.string().describe("Text describing when payments are due, e.g., '50% advance, 50% on completion'"),
    terms: z.string().describe("Any additional text notes regarding payment terms")
  }).describe("Payment schedule and textual terms (do not include methods like UPI/Stripe here)")
});

export type ProposalType = z.infer<typeof ProposalSchemaV1>;
