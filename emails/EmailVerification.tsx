/**
 * Verification email template for signup confirmation.
 * Sent via Resend (SMTP) when using Supabase custom SMTP.
 * From address is configured in Supabase Dashboard → Auth → SMTP:
 * donotreply@setup.mealoffortune.io
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
  Preview,
  Section,
  Text,
  Tailwind
} from '@react-email/components'

export type EmailVerificationProps = {
  userEmail?: string
  verificationUrl?: string
}

export default function EmailVerification (props: EmailVerificationProps) {
  const { userEmail = 'trippintreeko@gmail.com', verificationUrl = 'https://example.com/verify' } = props

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Verify your email address to complete your account setup</Preview>
        <Body className="bg-gray-100 font-sans py-[40px]">
          <Container className="bg-white rounded-[8px] px-[48px] py-[40px] mx-auto max-w-[600px]">
            {/* Header */}
            <Section className="text-center mb-[32px]">
              <Heading className="text-[28px] font-bold text-gray-900 mb-[16px] mt-0">
                Verify Your Email Address
              </Heading>
              <Text className="text-[16px] text-gray-600 mt-0 mb-0">
                Welcome! Please confirm your email address to get started.
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="mb-[32px]">
              <Text className="text-[16px] text-gray-700 mb-[24px] mt-0">
                Hi there,
              </Text>
              <Text className="text-[16px] text-gray-700 mb-[24px] mt-0">
                Thanks for signing up! To complete your account setup and ensure you receive important updates,
                please verify your email address by clicking the button below.
              </Text>
              <Text className="text-[14px] text-gray-600 mb-[32px] mt-0">
                Email: <strong>{userEmail}</strong>
              </Text>
            </Section>

            {/* CTA Button */}
            <Section className="text-center mb-[32px]">
              <Button
                href={verificationUrl}
                className="bg-blue-600 text-white px-[32px] py-[16px] rounded-[8px] text-[16px] font-semibold no-underline box-border"
              >
                Verify Email Address
              </Button>
            </Section>

            {/* Alternative Link */}
            <Section className="mb-[32px]">
              <Text className="text-[14px] text-gray-600 mb-[16px] mt-0">
                If the button doesn&apos;t work, copy and paste this link into your browser:
              </Text>
              <Link
                href={verificationUrl}
                className="text-blue-600 text-[14px] break-all"
              >
                {verificationUrl}
              </Link>
            </Section>

            {/* Security Notice */}
            <Section className="border-t border-solid border-gray-200 pt-[24px] mb-[32px]">
              <Text className="text-[14px] text-gray-600 mb-[16px] mt-0">
                <strong>Security Notice:</strong> This verification link will expire in 24 hours for your security.
                If you didn&apos;t create an account, you can safely ignore this email.
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-t border-solid border-gray-200 pt-[24px]">
              <Text className="text-[12px] text-gray-500 text-center m-0">
                This email was sent to {userEmail}
              </Text>
              <Text className="text-[12px] text-gray-500 text-center m-0">
                123 Main Street, St. Louis, MO 63101
              </Text>
              <Text className="text-[12px] text-gray-500 text-center m-0">
                <Link href="#" className="text-gray-500 no-underline">
                  Unsubscribe
                </Link>
                {' '}
                | © 2026 Your Company Name
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export const EmailVerificationPreviewProps: EmailVerificationProps = {
  userEmail: 'trippintreeko@gmail.com',
  verificationUrl: 'https://example.com/verify?token=abc123xyz789'
}
