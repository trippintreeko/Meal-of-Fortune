/**
 * Account deleted confirmation email template.
 * Sent via Resend when a user deletes their account (e.g. from delete-account Edge Function).
 * From: donotreply@setup.mealoffortune.io
 */
import * as React from 'react'
import {
  Body,
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

export type AccountDeletedProps = {
  userEmail?: string
  userName?: string
  supportEmail?: string
}

const DEFAULT_SUPPORT_EMAIL = 'support@mealoffortune.io'

export default function AccountDeleted (props: AccountDeletedProps) {
  const {
    userEmail = 'trippintreeko@gmail.com',
    userName = 'there',
    supportEmail = DEFAULT_SUPPORT_EMAIL
  } = props

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Your account has been successfully deleted</Preview>
        <Body className="bg-gray-100 font-sans py-[40px]">
          <Container className="bg-white rounded-[8px] px-[48px] py-[40px] mx-auto max-w-[600px]">
            <Section className="text-center mb-[32px]">
              <Heading className="text-[28px] font-bold text-gray-900 mb-[16px] mt-0">
                Account Successfully Deleted
              </Heading>
              <Text className="text-[16px] text-gray-600 mt-0 mb-0">
                Your account and all associated data have been removed
              </Text>
            </Section>

            <Section className="mb-[32px]">
              <Text className="text-[16px] text-gray-700 mb-[24px] mt-0">
                Hi {userName},
              </Text>
              <Text className="text-[16px] text-gray-700 mb-[24px] mt-0">
                This email confirms that your account has been permanently deleted from our system
                as requested. All your personal data and account information have been securely removed.
              </Text>
              <Text className="text-[14px] text-gray-600 mb-[32px] mt-0">
                Deleted account: <strong>{userEmail}</strong>
              </Text>
            </Section>

            <Section className="bg-green-50 border border-solid border-green-200 rounded-[8px] p-[24px] mb-[32px]">
              <Text className="text-[14px] text-green-800 mb-[12px] mt-0">
                <strong>✅ What has been deleted:</strong>
              </Text>
              <Text className="text-[14px] text-green-800 mb-[8px] mt-0">
                • Your profile and personal information
              </Text>
              <Text className="text-[14px] text-green-800 mb-[8px] mt-0">
                • All saved data, preferences, and settings
              </Text>
              <Text className="text-[14px] text-green-800 mb-[8px] mt-0">
                • Account history and activity logs
              </Text>
              <Text className="text-[14px] text-green-800 mb-[8px] mt-0">
                • Access to all services and features
              </Text>
              <Text className="text-[14px] text-green-800 mb-0 mt-0">
                • Any active subscriptions have been cancelled
              </Text>
            </Section>

            <Section className="mb-[32px]">
              <Text className="text-[16px] text-gray-700 mb-[16px] mt-0">
                <strong>Important Information:</strong>
              </Text>
              <Text className="text-[14px] text-gray-600 mb-[16px] mt-0">
                • This action is permanent and cannot be undone
              </Text>
              <Text className="text-[14px] text-gray-600 mb-[16px] mt-0">
                • You will no longer receive emails from us (except this final confirmation)
              </Text>
              <Text className="text-[14px] text-gray-600 mb-[16px] mt-0">
                • Any pending refunds will be processed according to our refund policy
              </Text>
              <Text className="text-[14px] text-gray-600 mb-[16px] mt-0">
                • If you have any outstanding payments, you remain responsible for them
              </Text>
            </Section>

            <Section className="bg-blue-50 border border-solid border-blue-200 rounded-[8px] p-[24px] mb-[32px]">
              <Text className="text-[14px] text-blue-800 mb-[12px] mt-0">
                <strong>📋 Data Retention Notice:</strong>
              </Text>
              <Text className="text-[14px] text-blue-800 mb-[8px] mt-0">
                While your account has been deleted, we may retain certain information for legal
                and regulatory compliance purposes, including:
              </Text>
              <Text className="text-[14px] text-blue-800 mb-[8px] mt-0">
                • Transaction records (for tax and accounting purposes)
              </Text>
              <Text className="text-[14px] text-blue-800 mb-[8px] mt-0">
                • Communication logs (for dispute resolution)
              </Text>
              <Text className="text-[14px] text-blue-800 mb-[0] mt-0">
                This data is stored securely and will be deleted after the required retention period.
              </Text>
            </Section>

            <Section className="mb-[32px]">
              <Text className="text-[16px] text-gray-700 mb-[16px] mt-0">
                <strong>Want to come back?</strong>
              </Text>
              <Text className="text-[14px] text-gray-600 mb-[16px] mt-0">
                You&apos;re always welcome to create a new account in the future. However, please note
                that you&apos;ll be starting fresh - none of your previous data can be recovered.
              </Text>
              <Text className="text-[14px] text-gray-600 mb-[16px] mt-0">
                If you deleted your account by mistake or need assistance, please contact our
                support team as soon as possible.
              </Text>
              <Link href={`mailto:${supportEmail}`} className="text-blue-600 text-[14px]">
                Contact Support →
              </Link>
            </Section>

            <Section className="text-center mb-[32px]">
              <Text className="text-[16px] text-gray-700 mb-[16px] mt-0">
                <strong>Thank you for being part of our community.</strong>
              </Text>
              <Text className="text-[14px] text-gray-600 mb-0 mt-0">
                We appreciate the time you spent with us and wish you all the best in your future endeavors.
              </Text>
            </Section>

            <Section className="border-t border-solid border-gray-200 pt-[24px]">
              <Text className="text-[12px] text-gray-500 text-center m-0">
                This final email was sent to {userEmail}
              </Text>
              <Text className="text-[12px] text-gray-500 text-center m-0">
                123 Main Street, St. Louis, MO 63101
              </Text>
              <Text className="text-[12px] text-gray-500 text-center m-0">
                © 2026 Meal of Fortune
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export const AccountDeletedPreviewProps: AccountDeletedProps = {
  userEmail: 'trippintreeko@gmail.com',
  userName: 'John',
  supportEmail: DEFAULT_SUPPORT_EMAIL
}
