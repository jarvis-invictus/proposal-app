import { Resend } from 'resend'
import type { ReactElement } from 'react'
import { logError } from '@/lib/logging'

// Testing sender that works without a verified domain — swap for a real "from" once Sahil
// verifies a domain in Resend.
const FROM_ADDRESS = 'Marg <onboarding@resend.dev>'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

if (!resend && process.env.NODE_ENV !== 'production') {
  console.warn('[email] RESEND_API_KEY not set — emails will be logged to the console instead of sent.')
}

export interface SendEmailOptions {
  to: string
  subject: string
  react: ReactElement
  /** Shown only in the local mock-log line when Resend isn't configured — the real send renders
   * the link from inside `react` itself, this is just so the mock log is actually useful for
   * testing a flow locally (e.g. copy-pasting an invite link straight out of the terminal). */
  mockLink?: string
}

/** Same shape whether or not Resend is configured — callers never need their own env-presence
 * branching, matching how lib/ratelimit.ts and lib/stripe.ts already handle "not configured
 * locally" for their respective services. */
export async function sendEmail({ to, subject, react, mockLink }: SendEmailOptions): Promise<{ mocked: boolean }> {
  if (!resend) {
    console.log(`Mock Email Sent to ${to}: ${subject} - Link: ${mockLink ?? 'n/a'}`)
    return { mocked: true }
  }

  try {
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, react })
    if (error) logError('[email] Resend rejected the send:', error, { to, subject })
  } catch (err) {
    // A failed email must never take down the action that triggered it (inviting a teammate,
    // recording a signature) — log and move on.
    logError('[email] Failed to send email via Resend:', err, { to, subject })
  }
  return { mocked: false }
}
