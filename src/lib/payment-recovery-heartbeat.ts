import {request} from 'node:https';

const PING_URL = /^https:\/\/hc-ping\.com\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function paymentRecoveryHeartbeatTarget(): string | null {
  // Require an explicit production deployment, including when NODE_ENV is
  // production for a local build. Never enable this through a NEXT_PUBLIC flag.
  if (process.env.VERCEL_ENV !== 'production' ||
      process.env.DRIVEDROP_PAYMENT_HEALTHCHECK_ENABLED !== 'true') return null;
  const target = process.env.DRIVEDROP_PAYMENT_HEALTHCHECK_URL || '';
  if (!PING_URL.test(target) || target !== target.trim()) {
    console.error('Payment recovery heartbeat failed', {reason: 'configuration'});
    return null;
  }
  return target;
}

export async function sendPaymentRecoveryHeartbeat(target: string, healthy: boolean, timeoutMs: number) {
  try {
    if (target !== paymentRecoveryHeartbeatTarget()) return;
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2000) throw new Error();
    // Native HTTPS avoids Next fetch-cache/tracing of this credential-bearing
    // URL. It does not follow redirects. No run IDs, payload or auth headers.
    await new Promise<void>((resolve, reject) => {
      const req = request(target + (healthy ? '' : '/fail'), {
        method: 'POST', headers: {'Content-Length': '0'}, agent: false,
        signal: AbortSignal.timeout(timeoutMs),
      }, res => {
        let body = '', responseBytes = 0;
        res.on('data', (chunk: Buffer) => {
          responseBytes += chunk.length;
          if (responseBytes > 32) {
            reject(new Error('Unexpected heartbeat response'));
            req.destroy(new Error('Unexpected heartbeat response'));
            return;
          }
          body += chunk.toString('utf8');
        });
        res.on('end', () => {
          // UUID endpoints also return HTTP 200 for not-found/rate-limited
          // pings. Only the exact normal acknowledgement counts as accepted.
          if (res.statusCode === 200 && body === 'OK') resolve();
          else reject(new Error('Heartbeat not accepted'));
        });
        res.on('error', reject);
        res.on('aborted', () => reject(new Error('Heartbeat response aborted')));
      });
      req.on('error', reject);
      req.end();
    });
  } catch {
    // Provider errors may contain the private URL. Never log the error object,
    // response body, URL, or financial data, and never retry a financial stage.
    console.error('Payment recovery heartbeat failed', {reason: 'delivery'});
  }
}
