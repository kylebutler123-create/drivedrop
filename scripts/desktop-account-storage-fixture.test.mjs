import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {startCustomerPhotoStorageFixture} from './desktop-account-storage-fixture.mjs';

const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
const isolated = {CI: 'true', DRIVEDROP_ISOLATED_BROWSER_TEST: 'true',
  POSTGRES_PRISMA_URL: 'postgresql://ci_only:ci_only@127.0.0.1:55432/drivedrop_browser_ci'};
for (const changes of [{CI: 'false'}, {DRIVEDROP_ISOLATED_BROWSER_TEST: 'false'},
  {POSTGRES_PRISMA_URL: 'postgresql://ci_only:ci_only@database.example.test:55432/drivedrop_browser_ci'},
  {POSTGRES_PRISMA_URL: 'postgresql://ci_only:ci_only@127.0.0.1:55432/other_database'},
  {SUPABASE_URL: 'https://storage.example.test'}, {SUPABASE_SERVICE_ROLE_KEY: 'unexpected-config'}]) {
  await assert.rejects(startCustomerPhotoStorageFixture({...isolated, ...changes}), /isolated local CI/);
}
const fixture = await startCustomerPhotoStorageFixture(isolated);
try {
  let actor = {id: 'ci-customer', role: 'CUSTOMER'};
  const routeEnv = {...fixture.env, VERCEL_ENV: 'preview'};
  function load(source, imports) {
    const exports = {};
    const {code} = swc.transformSync(readFileSync(source, 'utf8'), {
      filename: source, jsc: {parser: {syntax: 'typescript'}, target: 'es2022'}, module: {type: 'commonjs'},
    });
    vm.runInNewContext(code, {exports, fetch, Request, Response, File, console,
      process: {env: routeEnv},
      require: name => Object.hasOwn(imports, name) ? imports[name] : require(name),
    }, {filename: source});
    return exports;
  }
  const storage = load('src/lib/customer-photo-storage.ts', {});
  const {GET} = load('src/app/api/account/customer-photo/route.ts', {
    '@/lib/auth': {currentUser: async () => actor},
    '@/lib/supabase-storage': {},
    '@/lib/customer-photo-storage': storage,
  });
  const empty = await GET();
  assert.equal(empty.status, 204, 'The actual photo route must translate missing optional storage data to no content');
  assert.match(empty.headers.get('cache-control'), /private, no-store/);
  assert.equal(fixture.observations.missingAvatarReads, 1);
  actor = {id: 'ci-transporter', role: 'TRANSPORTER'};
  assert.equal((await GET()).status, 403);
  actor = null;
  assert.equal((await GET()).status, 403);
  assert.equal(fixture.observations.missingAvatarReads, 1, 'Denied callers must never reach storage');
  actor = {id: 'unexpected-customer', role: 'CUSTOMER'};
  assert.equal((await GET()).status, 502, 'The fixture must not hide an unexpected user/path as an absent photo');
  assert.equal(fixture.observations.unexpectedRequests, 1);
  const unknown = await fetch(fixture.env.SUPABASE_URL + '/storage/v1/object/customer-avatars', {method: 'POST', body: 'unexpected'});
  assert.equal(unknown.status, 500, 'Uploads are outside this fixture and must fail');
  actor = {id: 'ci-customer', role: 'CUSTOMER'};
  delete routeEnv.SUPABASE_URL;
  assert.equal((await GET()).status, 503, 'Missing real storage configuration must remain an error');
  const baseline = await startCustomerPhotoStorageFixture(isolated, 'baseline');
  try {
    const readPath = (server, path) => {
      const key = server.env.SUPABASE_SERVICE_ROLE_KEY;
      return fetch(server.env.SUPABASE_URL + '/storage/v1/object/authenticated/' + path,
        {headers: {apikey: key, Authorization: 'Bearer ' + key}});
    };
    const privatePath = 'customer-avatars/preview/ci-customer/avatar';
    const legacyPath = 'transporter-profiles/' + privatePath;
    assert.equal((await readPath(baseline, legacyPath)).status, 404);
    assert.equal((await readPath(baseline, privatePath)).status, 500);
    assert.equal((await readPath(fixture, legacyPath)).status, 500, 'Updated builds must reject the legacy bucket');
  } finally {
    await baseline.close();
  }
  console.log('PASS isolated storage guard, actual empty-avatar response, caller denials and unexpected request failures');
} finally {
  await fixture.close();
}
