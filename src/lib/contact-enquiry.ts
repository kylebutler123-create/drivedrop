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

export async function sendContactEnquiry(enquiry: ContactEnquiry) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !transactionalNotificationsEnabled()) return {sent: false, reason: 'disabled'} as const;

  // Keep the recipient fixed. The visitor's address is only used for replies;
  // this public endpoint must never become a way to send to arbitrary people.
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `contact-enquiry/${process.env.VERCEL_ENV || 'development'}/${enquiry.requestId}`,
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
