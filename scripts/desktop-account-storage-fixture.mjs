import {createServer} from 'node:http';

// Only the absent optional avatar is simulated. No upload or financial endpoint
// is mocked, and this fixture is never imported by the application.
export async function startCustomerPhotoStorageFixture(env) {
  const database = new URL(env.POSTGRES_PRISMA_URL || '');
  if (env.CI !== 'true' || env.DRIVEDROP_ISOLATED_BROWSER_TEST !== 'true' ||
      !['127.0.0.1', 'localhost'].includes(database.hostname) ||
      database.port !== '55432' || database.pathname !== '/drivedrop_browser_ci' ||
      env.SUPABASE_URL || env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Storage fixture requires isolated local CI without hosted storage configuration');
  }
  const key = 'ci-empty-customer-avatar-fixture';
  const expectedPath = '/storage/v1/object/authenticated/transporter-profiles/customer-avatars/preview/ci-customer/avatar';
  const observations = {missingAvatarReads: 0, unexpectedRequests: 0};
  const server = createServer((request, response) => {
    const expected = request.method === 'GET' && request.url === expectedPath &&
      request.headers.apikey === key && request.headers.authorization === `Bearer ${key}`;
    request.resume();
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    if (expected) {
      observations.missingAvatarReads++;
      response.writeHead(404).end(JSON.stringify({error: 'Object not found'}));
    } else {
      observations.unexpectedRequests++;
      response.writeHead(500).end(JSON.stringify({error: 'Unexpected isolated storage request'}));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    env: {SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_SERVICE_ROLE_KEY: key},
    observations,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
