/** Native sessions are deliberately distinct from website session tokens. */
export const MOBILE_TOKEN_PATTERN = /^ddm_[a-f0-9]{64}$/;
export const MOBILE_SESSION_MS = 14 * 24 * 60 * 60 * 1000;

export function mobileBearer(value: string | null): string | null {
  const match = /^Bearer (ddm_[a-f0-9]{64})$/.exec(value || '');
  return match?.[1] || null;
}

/** No arbitrary redirect, API, admin or credential-bearing destination. */
export function mobileWebPath(value: unknown, role: string): string | null {
  if (typeof value !== 'string' || value.length > 1000 || !value.startsWith('/') || /[\\\r\n]/.test(value)) return null;
  const url = new URL(value, 'https://drive-drop.com');
  if (url.origin !== 'https://drive-drop.com' || url.hash) return null;
  const common = ['/account', '/messages', '/notifications', '/help', '/contact', '/privacy', '/terms'];
  const allowed = role === 'CUSTOMER'
    ? [...common, '/customer', '/get-quotes', '/payments']
    : role === 'TRANSPORTER'
      ? [...common, '/transporter', '/transporter/quotes', '/transporter/proceeds', '/transporter/verification', '/transporter/reviews', '/transporter/delivered']
      : [];
  if (!allowed.includes(url.pathname)) return null;
  for (const key of url.searchParams.keys()) if (!['view', 'bookingId', 'jobId', 'requestId'].includes(key)) return null;
  return `${url.pathname}${url.search}`;
}
