import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

export interface ProposalSignedEmailProps {
  proposalName: string
  clientName: string
  /** Optional — not in the original spec for this template, but without some way back into the
   * document this notification is a dead end. Renders nothing when omitted. */
  viewLink?: string
}

export function ProposalSignedEmail({ proposalName, clientName, viewLink }: ProposalSignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{clientName} just signed {proposalName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Your proposal was signed</Heading>
          <Text style={text}>
            <strong>{clientName}</strong> has signed <strong>{proposalName}</strong>. It&apos;s now a legally binding
            document — the signature certificate is attached to the proposal itself.
          </Text>
          {viewLink && (
            <Button href={viewLink} style={button}>
              View signed proposal
            </Button>
          )}
        </Container>
      </Body>
    </Html>
  )
}

export default ProposalSignedEmail

const main = { backgroundColor: '#f6f6f7', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', padding: '40px 0' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '40px', borderRadius: '12px', maxWidth: '480px' }
const heading = { fontSize: '22px', fontWeight: 600, color: '#171717', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#3d4451', margin: '0 0 24px' }
const button = {
  backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '15px', fontWeight: 600,
  textDecoration: 'none', padding: '12px 24px', borderRadius: '999px', display: 'inline-block',
}
