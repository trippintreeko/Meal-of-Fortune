/**
 * Password reset email template.
 * Sent via Resend (SMTP) when using Supabase custom SMTP.
 * From: donotreply@setup.mealoffortune.io
 * Uses inline styles for reliable HTML output (no Tailwind).
 */
import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Section,
  Text
} from '@react-email/components'

export type PasswordResetProps = {
  userEmail?: string
  resetUrl?: string
  userName?: string
}

const DEFAULT_SUPPORT_EMAIL = 'support@mealoffortune.io'

export default function PasswordReset (props: PasswordResetProps) {
  const {
    userEmail = 'trippintreeko@gmail.com',
    resetUrl = 'https://example.com/reset-password',
    userName = 'there'
  } = props

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={sectionCenter}>
            <Heading style={heading}>Password Reset Request</Heading>
            <Text style={textSub}>We received a request to reset your password</Text>
          </Section>

          <Section style={section}>
            <Text style={textBody}>Hi {userName},</Text>
            <Text style={textBody}>
              Someone requested a password reset for your account associated with this email address.
              If this was you, click the button below to create a new password.
            </Text>
            <Text style={textSmall}>
              Account: <strong>{userEmail}</strong>
            </Text>
          </Section>

          <Section style={sectionCenter}>
            <Button href={resetUrl} style={button}>
              Reset My Password
            </Button>
          </Section>

          <Section style={section}>
            <Text style={textSmall}>
              If the button doesn&apos;t work, copy and paste this link into your browser:
            </Text>
            <Link href={resetUrl} style={link}>
              {resetUrl}
            </Link>
          </Section>

          <Section style={sectionYellow}>
            <Text style={textYellowBold}>Important Security Information:</Text>
            <Text style={textYellow}>This reset link will expire in <strong>1 hour</strong> for your security</Text>
            <Text style={textYellow}>If you didn&apos;t request this reset, please ignore this email</Text>
            <Text style={textYellowLast}>Your current password remains unchanged until you create a new one</Text>
          </Section>

          <Section style={section}>
            <Text style={textBodyBold}>Didn&apos;t request this password reset?</Text>
            <Text style={textSmall}>
              If you didn&apos;t request a password reset, your account may be at risk. Please:
            </Text>
            <Text style={textSmall}>1. Change your password immediately by logging into your account</Text>
            <Text style={textSmall}>2. Review your recent account activity</Text>
            <Text style={textSmall}>3. Contact our support team if you notice any suspicious activity</Text>
            <Link href={`mailto:${DEFAULT_SUPPORT_EMAIL}`} style={link}>
              Contact Support →
            </Link>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>This email was sent to {userEmail}</Text>
            <Text style={footerText}>123 Main Street, St. Louis, MO 63101</Text>
            <Text style={footerText}>
              <Link href="#" style={footerLink}>Unsubscribe</Link> | © 2026 Meal of Fortune
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  paddingTop: 40,
  paddingBottom: 40
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  padding: '40px 48px',
  maxWidth: 600,
  margin: '0 auto'
}

const section: React.CSSProperties = {
  marginBottom: 32
}

const sectionCenter: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 32
}

const heading: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: '#111827',
  marginBottom: 16,
  marginTop: 0
}

const textSub: React.CSSProperties = {
  fontSize: 16,
  color: '#4b5563',
  marginTop: 0,
  marginBottom: 0
}

const textBody: React.CSSProperties = {
  fontSize: 16,
  color: '#374151',
  marginBottom: 24,
  marginTop: 0
}

const textBodyBold: React.CSSProperties = {
  fontSize: 16,
  color: '#374151',
  marginBottom: 16,
  marginTop: 0,
  fontWeight: 600
}

const textSmall: React.CSSProperties = {
  fontSize: 14,
  color: '#4b5563',
  marginBottom: 8,
  marginTop: 0
}

const button: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '16px 32px',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  textDecoration: 'none'
}

const link: React.CSSProperties = {
  color: '#2563eb',
  fontSize: 14,
  wordBreak: 'break-all' as const
}

const sectionYellow: React.CSSProperties = {
  backgroundColor: '#fefce8',
  border: '1px solid #fef08a',
  borderRadius: 8,
  padding: 24,
  marginBottom: 32
}

const textYellowBold: React.CSSProperties = {
  fontSize: 14,
  color: '#854d0e',
  marginBottom: 12,
  marginTop: 0,
  fontWeight: 600
}

const textYellow: React.CSSProperties = {
  fontSize: 14,
  color: '#854d0e',
  marginBottom: 8,
  marginTop: 0
}

const textYellowLast: React.CSSProperties = {
  fontSize: 14,
  color: '#854d0e',
  marginBottom: 0,
  marginTop: 0
}

const footer: React.CSSProperties = {
  borderTop: '1px solid #e5e7eb',
  paddingTop: 24
}

const footerText: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  textAlign: 'center',
  margin: 0
}

const footerLink: React.CSSProperties = {
  color: '#6b7280',
  textDecoration: 'none'
}

export const PasswordResetPreviewProps: PasswordResetProps = {
  userEmail: 'trippintreeko@gmail.com',
  resetUrl: 'https://example.com/reset-password?token=xyz789abc123',
  userName: 'John'
}
