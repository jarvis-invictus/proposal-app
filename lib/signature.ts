export type Signature = {
  ip_address: string
  user_agent: string
  consent_statement: string
}

/** Shown to the signer before they sign, and stored verbatim on the signature record — the two
 * must always match, so both the API route and the signing UI import this one constant. */
export const ESIGN_CONSENT_STATEMENT =
  'By signing this document, I acknowledge that I have read, understood, and agree to be legally bound by its terms, and I consent to the use of electronic signatures.'
