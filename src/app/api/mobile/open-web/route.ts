import {NextResponse} from 'next/server';
import {mobileEnabled, mobileJson, mobileSession, mobileUnavailable} from '@/lib/mobile-auth';
import {mobileWebPath} from '@/lib/mobile-policy';

/** The WebView POST body, never a URL/query or injected JavaScript, carries the token. */
export async function POST(request: Request) {
  if (!mobileEnabled()) return mobileUnavailable();
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if ((origin && origin !== new URL(request.url).origin) || (site && !['none', 'same-origin'].includes(site))) return mobileJson({error: 'Invalid request origin.'}, 403);
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return mobileJson({error: 'Invalid request.'}, 400);
  const raw = await request.text();
  if (raw.length > 4096) return mobileJson({error: 'Invalid request.'}, 400);
  const body = new URLSearchParams(raw);
  const session = await mobileSession(body.get('token'));
  if (!session) return mobileJson({error: 'Please sign in again.'}, 401);
  const path = mobileWebPath(body.get('path'), session.user.role);
  if (!path) return mobileJson({error: 'This page is not available in the app.'}, 400);
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.cookies.set('drivedrop_session', body.get('token')!, {httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires: session.expiresAt});
  response.headers.set('Cache-Control', 'no-store, private');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
