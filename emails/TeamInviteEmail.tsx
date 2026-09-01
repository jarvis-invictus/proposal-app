import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

export interface TeamInviteEmailProps {
  inviterName: string
  teamName: string
  inviteLink: string
}

export function TeamInviteEmail({ inviterName, teamName, inviteLink }: TeamInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to join {teamName} on Marg</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You&apos;ve been invited to {teamName}</Heading>
          <Text style={text}>
            {inviterName} has invited you to join <strong>{teamName}</strong> on Marg, to help create and manage proposals together.
          </Text>
          <Button href={inviteLink} style={button}>
            Accept invitation
          </Button>
          <Text style={mutedText}>
            If the button above doesn&apos;t work, copy and paste this link into your browser:
            <br />
            {inviteLink}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default TeamInviteEmail

const main = { backgroundColor: '#f6f6f7', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', padding: '40px 0' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '40px', borderRadius: '12px', maxWidth: '480px' }
const heading = { fontSize: '22px', fontWeight: 600, color: '#171717', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#3d4451', margin: '0 0 24px' }
const mutedText = { fontSize: '13px', lineHeight: '20px', color: '#7c8591', margin: '24px 0 0', wordBreak: 'break-all' as const }
const button = {
  backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '15px', fontWeight: 600,
  textDecoration: 'none', padding: '12px 24px', borderRadius: '999px', display: 'inline-block',
}
