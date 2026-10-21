import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {alternativeRefundsEnabled, recordAlternativeRefund} from '@/lib/alternative-refunds';
import {ConnectError, connectOrigin} from '@/lib/stripe-connect-provider';
import {MAX_ALTERNATIVE_REFUND_FILE_SIZE} from '@/lib/supabase-storage';

export const maxDuration = 90;
export const runtime = 'nodejs';
const maxBody = MAX_ALTERNATIVE_REFUND_FILE_SIZE + 64 * 1024;

// Bound streamed bodies too; Content-Length is not trusted or always present.
async function boundedForm(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;') || Number(request.headers.get('content-length')) > maxBody || !request.body) {
    throw new ConnectError('Upload a PDF, JPG or PNG no larger than 3 MB.');
  }
  const reader = request.body.getReader(), chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBody) {await reader.cancel(); throw new ConnectError('The repayment evidence request is too large.');}
      chunks.push(new Uint8Array(value));
    }
  } finally {reader.releaseLock();}
  return new Response(new Blob(chunks), {headers: {'content-type': request.headers.get('content-type')!}}).formData();
}

export async function POST(request: Request) {
  if (!alternativeRefundsEnabled()) return NextResponse.json({error: 'Alternative refund recording is disabled.'}, {status: 403});
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN' || user.accountStatus !== 'ACTIVE') return NextResponse.json({error: 'Active administrator access required.'}, {status: 403});
  try {
    // Strict Origin is required even for multipart uploads (CSRF simple requests).
    if (request.headers.get('origin') !== connectOrigin()) return NextResponse.json({error: 'Invalid request origin.'}, {status: 403});
    const form = await boundedForm(request), value = form.get('details'), file = form.get('evidence');
    if (typeof value !== 'string' || !(file instanceof File) || form.getAll('evidence').length !== 1 || form.getAll('details').length !== 1) {
      return NextResponse.json({error: 'Repayment details and one evidence file are required.'}, {status: 400});
    }
    let input: unknown;
    try {input = JSON.parse(value);} catch {return NextResponse.json({error: 'Invalid repayment details.'}, {status: 400});}
    const result = await recordAlternativeRefund(input, file, user.id);
    return NextResponse.json(result, {status: result.replayed ? 200 : 201, headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    if (error instanceof ConnectError) return NextResponse.json({error: error.message}, {status: 409});
    // Includes unique-reference races, failed reads and ambiguous commit replies.
    // Retry with the same request id; never expose provider/DB errors or evidence.
    return NextResponse.json({error: 'The record could not be confirmed. Keep this form open and retry the same submission, or refresh to check whether it was saved.'}, {status: 409});
  }
}
