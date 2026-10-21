import https from 'node:https';
import type {ClientRequest} from 'node:http';
import {createHash} from 'node:crypto';
import Stripe from 'stripe';

// Temporary, single-fixture test hook. Remove from the deployed provider after QA.
export const NETWORK_QA_PAYMENT_ID = 'cmvhg5nf60002l908u3h2k34o';
export const NETWORK_QA_TRANSFER_ID = 'tr_3USoVxLAzgkvCvrI0lyP8SlS';
const expiresAt = Date.parse('2026-10-22T00:00:00Z');
type Request = (options: https.RequestOptions, onResponse: (response: import('node:http').IncomingMessage) => void) => ClientRequest;
type Client = ReturnType<typeof Stripe.createNodeHttpClient>;

export function networkQaMatches(args: Parameters<Client['makeRequest']>, now = Date.now()) {
  const [host, port, path, method, headers, body, protocol] = args;
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'feature/ui-polish' ||
      process.env.STRIPE_REFUNDS_ENABLED !== 'true' || now >= expiresAt ||
      host !== 'api.stripe.com' || String(port) !== '443' || protocol !== 'https' ||
      path !== `/v1/transfers/${NETWORK_QA_TRANSFER_ID}/reversals` || method !== 'POST') return false;
  const form = new URLSearchParams(body);
  const refundId = form.get('metadata[driveDropRefundId]');
  return form.get('amount') === '100' && form.get('metadata[paymentId]') === NETWORK_QA_PAYMENT_ID &&
    form.get('metadata[environment]') === 'preview' &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(refundId || '') &&
    headers['Idempotency-Key'] === `dd-refund-reversal-preview-${refundId}` &&
    [...form.keys()].sort().join(',') === 'amount,metadata[driveDropRefundId],metadata[environment],metadata[paymentId]';
}

// Native HTTPS closes in the response callback, before a body listener or SDK
// response object exists. No proxy, endpoint, credential export or TLS bypass.
export function createNetworkQaClient(request: Request = https.request): Client {
  const ordinary = Stripe.createNodeHttpClient();
  return {
    getClientName: () => 'node',
    makeRequest: (...args) => {
      if (!networkQaMatches(args)) return ordinary.makeRequest(...args);
      const [host, port, path, method, headers, body, , timeout] = args;
      return new Promise((resolve, reject) => {
        const req = request({host, port, path, method, headers, agent: false}, response => {
          const status = response.statusCode || 0;
          response.on('error', () => {});
          if (status < 200 || status >= 300) {
            response.resume();
            console.info('STRIPE_REVERSAL_QA_NON_SUCCESS', {status, requestId: response.headers['request-id']});
            reject(new Error('Sandbox network QA received a non-success response'));
            return;
          }
          const proof = {
            paymentId: NETWORK_QA_PAYMENT_ID,
            transferId: NETWORK_QA_TRANSFER_ID,
            status,
            requestId: response.headers['request-id'],
            idempotentReplayed: response.headers['idempotent-replayed'] === 'true',
            idempotencyDigest: createHash('sha256').update(String(headers['Idempotency-Key'])).digest('hex'),
            bodyCompleteBeforeClose: response.complete,
            bufferedBodyBytes: response.readableLength,
          };
          const error = Object.assign(new Error('Approved sandbox response connection interrupted'), {code: 'ECONNRESET'});
          response.destroy();
          req.destroy(error);
          console.info('STRIPE_REVERSAL_QA_CONNECTION_CLOSED', {...proof,
            responseDestroyed: response.destroyed, requestDestroyed: req.destroyed});
          reject(error);
        });
        req.setTimeout(timeout, () => req.destroy(Stripe.HttpClient.makeTimeoutError()));
        req.on('error', reject);
        req.end(body);
      });
    },
  };
}
