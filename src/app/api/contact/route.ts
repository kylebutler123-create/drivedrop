import {contactEnquirySchema, sendContactEnquiry} from '@/lib/contact-enquiry';
import {checkRateLimit, rateLimitResponse} from '@/lib/rate-limit';
import {SUPPORT_CONTACT} from '@/lib/support-contact';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 32_000;
const json = (body: object, status = 200) => Response.json(body, {
  status,
  headers: {'Cache-Control': 'no-store'},
});

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return json({error: 'Please send your message from the DriveDrop contact page.'}, 403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({error: 'Invalid message format.'}, 415);
  }

  const limit = checkRateLimit(request, 'contact-enquiry', 5, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return json({error: 'Your message is too long. Please shorten it and try again.'}, 413);
  }

  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({error: 'Please complete the message form.'}, 400);
    const decoder = new TextDecoder('utf-8', {fatal: true});
    let bytes = 0;
    let text = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return json({error: 'Your message is too long. Please shorten it and try again.'}, 413);
      }
      text += decoder.decode(value, {stream: true});
    }
    body = JSON.parse(text + decoder.decode());
  } catch {
    return json({error: 'We could not read your message. Please try again.'}, 400);
  }

  const parsed = contactEnquirySchema.safeParse(body);
  if (!parsed.success) {
    return json({error: 'Check your email address and required fields. Messages can be up to 5,000 characters.'}, 400);
  }

  try {
    const result = await sendContactEnquiry(parsed.data);
    if (!result.sent) {
      return json({error: `Message sending is temporarily unavailable. Please email ${SUPPORT_CONTACT.email}.`}, 503);
    }
    return json({sent: true});
  } catch {
    // Never log the visitor's message, contact details or provider credentials.
    console.error('DriveDrop contact enquiry email could not be confirmed');
    return json({error: `We could not confirm your message was sent. Please try again, or email ${SUPPORT_CONTACT.email}.`}, 502);
  }
}
