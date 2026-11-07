const configuredOrigin = process.env.EXPO_PUBLIC_API_ORIGIN || 'https://drive-drop.com';
const origin = new URL(configuredOrigin);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
    || !(origin.hostname === 'drive-drop.com' || /^drivedrop-[a-z0-9-]+-future-9f39\.vercel\.app$/.test(origin.hostname))) {
  throw new Error('Use the canonical DriveDrop HTTPS origin or a reviewed DriveDrop preview.');
}
export const API_ORIGIN = origin.origin;
export const PUBLIC_ORIGIN = 'https://drive-drop.com';
export const TOKEN_KEY = `drivedrop.native.session.${origin.hostname}`;

export function webPath(path: unknown): string | null {
  if (typeof path !== 'string' || !path.startsWith('/') || /[\\\r\n]/.test(path) || path.length > 1000) return null;
  const url = new URL(path, API_ORIGIN);
  if (url.origin !== API_ORIGIN || url.hash || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return null;
  return url.pathname + url.search;
}

export function navigationKind(value: string): 'internal' | 'external' | 'telephone' | 'blocked' {
  try {
    const url = new URL(value);
    if (url.username || url.password) return 'blocked';
    if (url.protocol === 'tel:' && /^tel:\+?[\d ()-]+$/.test(value)) return 'telephone';
    if (url.protocol !== 'https:') return 'blocked';
    if (url.origin === API_ORIGIN) return 'internal';
    // Only reviewed payment, payout and support destinations may leave the app automatically.
    if (['checkout.stripe.com', 'connect.stripe.com', 'billing.stripe.com', 'support.stripe.com'].includes(url.hostname)) return 'external';
    return 'blocked';
  } catch { return 'blocked'; }
}

export function mapUrl(address: string, platform: string): string {
  return platform === 'ios'
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
}
