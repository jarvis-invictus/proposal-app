import crypto from 'crypto'

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1'

function authHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set in .env.local')
  }
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
}

/** Amount in the smallest currency unit (e.g. paise for INR), matching Razorpay's API. */
export async function createRazorpayOrder({ amount, currency, receipt, notes }: {
  amount: number
  currency: string
  receipt: string
  notes?: Record<string, string>
}) {
  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency, receipt, notes }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Razorpay order creation failed: ${res.status} ${body}`)
  }
  return res.json() as Promise<{ id: string; amount: number; currency: string }>
}

export async function createRazorpayCustomer({ name, email }: { name: string; email: string }) {
  const res = await fetch(`${RAZORPAY_API_BASE}/customers`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, fail_existing: 0 }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Razorpay customer creation failed: ${res.status} ${body}`)
  }
  return res.json() as Promise<{ id: string }>
}

/** Post-checkout verification: Checkout.js hands back order_id + payment_id + signature. */
export function verifyRazorpayPaymentSignature({ orderId, paymentId, signature }: {
  orderId: string
  paymentId: string
  signature: string
}) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET is not set in .env.local')
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex')
  return expected === signature
}

/** Webhook body signing uses a separate secret (set when the webhook is registered in the Razorpay dashboard). */
export function verifyRazorpayWebhookSignature({ rawBody, signature }: { rawBody: string; signature: string }) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) throw new Error('RAZORPAY_WEBHOOK_SECRET is not set in .env.local')
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
  return expected === signature
}
