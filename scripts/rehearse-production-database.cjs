// Schema-only rehearsal. Never connects to a hosted database.
// WASM: PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite node scripts/rehearse-production-database.cjs
// Native: REHEARSAL_DATABASE_URL=postgres://...@127.0.0.1:PORT/drivedrop_rehearsal_NAME node scripts/rehearse-production-database.cjs
// Native mode requires an EMPTY disposable database and psql on PATH. It leaves the
// rehearsed schema for inspection; all synthetic financial rows roll back.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const migrationPath='scripts/production-database/supabase/migrations/20261021193022_production_payment_schema.sql';
const migration=read(migrationPath),baseline=read('scripts/sql/production-schema-baseline.sql');
const passed=[];
let db,engine;
async function open(){
  if(process.env.REHEARSAL_DATABASE_URL){
    const url=new URL(process.env.REHEARSAL_DATABASE_URL);
    assert(['postgres:','postgresql:'].includes(url.protocol)&&['localhost','127.0.0.1'].includes(url.hostname)&&url.port&&/^\/drivedrop_rehearsal_[a-z0-9_]+$/.test(url.pathname),'Only an explicitly named disposable localhost database is allowed');
    assert(!url.search,'Connection overrides are not allowed');
    engine='native';
    const run=sql=>execFileSync('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1',url.toString()],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']});
    db={exec:async sql=>run(sql),query:async sql=>({rows:JSON.parse(run(`SELECT coalesce(json_agg(q),'[]') FROM (${sql}) q;`))}),close:async()=>{}};
  }else{
    assert(process.env.PGLITE_MODULE&&path.isAbsolute(process.env.PGLITE_MODULE),'Specify PGLITE_MODULE or a disposable REHEARSAL_DATABASE_URL');
    const {PGlite}=require(process.env.PGLITE_MODULE);db=new PGlite();engine='wasm-single-backend';
  }
}
const query=async sql=>(await db.query(sql)).rows;
const pass=name=>{passed.push(name);console.log('PASS: '+name)};
async function reject(sql,pattern,name){
  let error;try{await db.exec(sql)}catch(e){error=String(e.message)+' '+String(e.stderr||'')}
  if(engine!=='native')await db.exec('ROLLBACK');
  assert(error&&pattern.test(error),`${name}: expected rejection, received ${error||'success'}`);pass(name);
}
(async()=>{
  await open();
  const version=(await query('SELECT version() AS version'))[0].version;
  if(process.env.REHEARSAL_REQUIRE_NATIVE_1711==='true')assert(engine==='native'&&version.startsWith('PostgreSQL 17.11 '),'This run requires native PostgreSQL 17.11');
  assert.equal((await query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')"))[0].n,0,'Rehearsal database must be empty');
  await db.exec(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  END $$;
  CREATE SCHEMA extensions; CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA supabase_migrations;
  CREATE TABLE auth.users(id text PRIMARY KEY); CREATE TABLE storage.objects(id text PRIMARY KEY);
  CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text);
  INSERT INTO supabase_migrations.schema_migrations VALUES ('20261019020729','drivedrop_production_schema_and_storage_baseline');
  ${baseline}
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon,authenticated;`);
  const fingerprint=migration.slice(migration.indexOf('SELECT md5('),migration.indexOf('\n  ) check_schema;'));
  const before=(await query(fingerprint))[0];
  assert.equal(before.schema_md5,'dbafd834d5aaa168c554d9a62c382b84');pass('Baseline catalog and five buckets exactly match the reviewed production fingerprint');
  const negatives=[
    ['INSERT INTO auth.users VALUES (\'synthetic\');',/auth\/storage must still be empty/,'Nonempty auth is rejected'],
    ['INSERT INTO storage.objects VALUES (\'synthetic\');',/auth\/storage must still be empty/,'Nonempty storage is rejected'],
    ['INSERT INTO public."User" (id,email,name,role,"passwordHash") VALUES (\'synthetic\',\'fixture@example.invalid\',\'Fixture\',\'ADMIN\',\'unused\');',/must still be empty/,'Nonempty application data is rejected'],
    ['ALTER TABLE public."TransporterCancellationFee" ALTER COLUMN "amountPence" SET DEFAULT 2500;',/differ from reviewed baseline/,'Changed cancellation fee is rejected'],
    ['ALTER TABLE public."User" ADD COLUMN drift text;',/differ from reviewed baseline/,'Unreviewed schema drift is rejected'],
    ["UPDATE storage.buckets SET public=true WHERE id='delivery-evidence';",/differ from reviewed baseline/,'Changed private bucket is rejected'],
    ['GRANT SELECT ON public."User" TO anon;',/Unexpected client table privileges/,'Effective anonymous privileges are rejected'],
    ['GRANT MAINTAIN ON public."User" TO authenticated;',/Unexpected client table privileges/,'PostgreSQL 17 MAINTAIN-only client privileges are rejected'],
    ["UPDATE supabase_migrations.schema_migrations SET name='unknown';",/Unexpected migration history/,'Unexpected migration history is rejected'],
  ];
  for(const [change,pattern,name] of negatives)await reject(`BEGIN; ${change} ${migration} ROLLBACK;`,pattern,name);
  assert.deepEqual((await query(fingerprint))[0],before);pass('Every rejected migration rolls back without baseline changes');
  await db.exec(`BEGIN; ${migration} COMMIT;`);
  pass('Additive migration and postflight commit in one transaction, including enum additions');
  const counts=(await query(`SELECT (SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,
    (SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public') AS columns,
    (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public') AS constraints,
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public') AS indexes,
    (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers`))[0];
  assert.deepEqual(counts,{tables:31,columns:377,constraints:140,indexes:121,triggers:4});
  const worker=read('src/lib/booking-authorisation-recovery.ts');
  const healthSql=worker.slice(worker.indexOf('const backlog =')).split('`')[1].replaceAll('${environment}',"'production'");
  const health=await query(healthSql);assert.equal(health.length,3);assert(health.every(row=>row.pending===0&&row.review===0&&row.reserved===0));
  pass('Actual recovery backlog SQL runs against the migrated schema without exposing record details');
  await reject(`BEGIN; ${migration} COMMIT;`,/recovery schema already exists/,'Repeat application refuses safely');
  await reject('BEGIN; SET LOCAL ROLE anon; SELECT * FROM public."AlternativeRefund"; ROLLBACK;',/permission denied/,'Anonymous evidence reads are denied despite broad default ACLs');
  await reject('BEGIN; SET LOCAL ROLE authenticated; SELECT * FROM drivedrop_production_ops.booking_authorisation_runs; ROLLBACK;',/permission denied/,'Authenticated clients cannot access recovery leases');
  await reject(`BEGIN; INSERT INTO drivedrop_production_ops.booking_authorisation_runs(id) VALUES ('first'),('second'); COMMIT;`,/unique constraint/,'Only one active recovery lease can exist');
  await db.exec(read('scripts/sql/rehearse-production-payment-audit.sql'));
  pass('Synthetic production audit: atomic ledger, immutable evidence/history, reservation, payout and duplicate guards');
  const environments=await query(`SELECT c.relname AS name,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid WHERE k.contype='c' AND pg_get_constraintdef(k.oid) LIKE '%environment%' ORDER BY c.relname,k.conname`);
  assert.equal(environments.length,4);assert(environments.every(x=>x.definition.includes("'production'")&&!x.definition.includes("'preview'")&&!x.definition.includes("'development'")));
  pass('All four payment tables accept production only; historical preview migrations are unchanged');
  assert.equal((await query('SELECT count(*)::int AS n FROM public."User"'))[0].n,0);pass('Synthetic financial fixtures roll back; application tables remain empty');
  const report={checkedAt:new Date().toISOString(),engine,version,native1711Verified:engine==='native'&&version.startsWith('PostgreSQL 17.11 '),migration:migrationPath,migrationSha256:createHash('sha256').update(migration).digest('hex'),baselineFingerprint:before.schema_md5,counts,passed,
    limitations:engine==='native'?['Local role/storage stubs do not certify Supabase Auth, Storage or hosted configuration.']:['WebAssembly PostgreSQL is a single backend. Native PostgreSQL 17.11 and cross-process locking remain unverified.','Local role/storage stubs do not certify Supabase Auth, Storage or hosted configuration.']};
  const out=process.env.REHEARSAL_REPORT||'/tmp/drivedrop-production-database-rehearsal.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log('Rehearsal report: '+out);
})().catch(e=>{console.error(e.message,String(e.stderr||''));process.exitCode=1}).finally(async()=>{if(db)await db.close()});
