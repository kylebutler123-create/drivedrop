import {z} from 'zod';
import {transactionalNotificationsEnabled} from './email';
import {CONTACT_ENQUIRY_TYPES, SUPPORT_CONTACT} from './support-contact';

const singleLine = (max: number) => z.string().trim().min(1).max(max).regex(/^[^\r\n\u0000]+$/);

export const contactEnquirySchema = z.object({
  name: singleLine(120),
  email: z.string().trim().email().max(254),
  enquiry: z.enum(CONTACT_ENQUIRY_TYPES),
  bookingReference: z.string().trim().max(100).regex(/^[^\r\n\u0000]*$/).default(''),
  subject: singleLine(200),
  message: z.string().trim().min(1).max(5000).refine(value => !value.includes('\u0000')),
  website: z.string().max(0).default(''),
  requestId: z.string().uuid(),
}).strict();

export type ContactEnquiry = z.infer<typeof contactEnquirySchema>;

// A bounded contact-form delivery check does not enable lifecycle notifications.
// Its fixed payload and provider idempotency key permit one support-mailbox email.
function productionContactTest(enquiry: ContactEnquiry) {
  if (process.env.VERCEL_ENV !== 'production') return null;
  try {
    const config = JSON.parse(process.env.DRIVEDROP_CONTACT_EMAIL_TEST || '');
    const id = z.string().uuid().parse(config.id);
    const start = Date.parse(config.startsAt);
    const end = Date.parse(config.expiresAt);
    const now = Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
        end - start > 60 * 60_000 || now < start || now >= end) return null;
    if (process.env.TRANSACTIONAL_EMAILS_SENDER_VERIFIED !== 'true' ||
        enquiry.email !== SUPPORT_CONTACT.email || enquiry.name !== 'DriveDrop email check' ||
        enquiry.enquiry !== 'General enquiry' || enquiry.bookingReference ||
        enquiry.subject !== `DriveDrop production email check ${id}` ||
        enquiry.message !== 'This is the authorised DriveDrop production contact-form delivery test. No booking or payment is involved.') return null;
    return id;
  } catch { return null; }
}

export async function sendContactEnquiry(enquiry: ContactEnquiry) {
  const key = process.env.RESEND_API_KEY;
  const testId = productionContactTest(enquiry);
  if (!key || (!transactionalNotificationsEnabled() && !testId)) return {sent: false, reason: 'disabled'} as const;

  // Keep the recipient fixed. The visitor's address is only used for replies;
  // this public endpoint must never become a way to send to arbitrary people.
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': testId ? `contact-production-test/${testId}` : `contact-enquiry/${process.env.VERCEL_ENV || 'development'}/${enquiry.requestId}`,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      from: 'DriveDrop contact form <account@contact.drive-drop.com>',
      to: [SUPPORT_CONTACT.email],
      reply_to: enquiry.email,
      subject: `[DriveDrop enquiry] ${enquiry.enquiry}: ${enquiry.subject}`,
      // Plain text keeps visitor-provided markup out of the email's HTML.
      text: [
        'New enquiry from the DriveDrop contact form',
        '',
        `Name: ${enquiry.name}`,
        `Email: ${enquiry.email}`,
        `Enquiry type: ${enquiry.enquiry}`,
        `Booking reference: ${enquiry.bookingReference || 'Not supplied'}`,
        `Subject: ${enquiry.subject}`,
        '',
        enquiry.message,
      ].join('\n'),
    }),
  });

  if (!response.ok) throw new Error(`CONTACT_EMAIL_${response.status}`);
  const result = await response.json();
  if (typeof result?.id !== 'string' || !result.id) throw new Error('CONTACT_EMAIL_NOT_ACCEPTED');
  return {sent: true} as const;
}
