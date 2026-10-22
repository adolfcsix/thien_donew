const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const preflight = (env={}) => spawnSync(process.execPath, [path.join(root,'infrastructure/scripts/preflight.mjs')], {env: {...process.env, NODE_ENV:'development', WEB_ORIGIN:'', DATABASE_URL:'', COOKIE_SECURE:'false', API_INTERNAL_URL:'',...env},encoding:'utf8'});
test('V8.5 preflight accepts local development env',()=>{
  const result=preflight({WEB_ORIGIN:'http://localhost:3000',API_INTERNAL_URL:'http://127.0.0.1:8080'});
  assert.equal(result.status,0,result.stderr);
});
test('V8.5 preflight prevents missing secrets or insecure production origin',()=>{
  const result=preflight({NODE_ENV:'production',WEB_ORIGIN:'http://localhost:3000'});
  assert.equal(result.status,1);assert.match(result.stderr,/DATABASE_URL/);assert.match(result.stderr,/COOKIE_SECURE/);assert.match(result.stderr,/HTTPS/);
});
test('V8.5 preflight rejects credential-bearing internal origin',()=>{
  const result=preflight({API_INTERNAL_URL:'http://user:pass@example.test:8080'});
  assert.equal(result.status,1);assert.match(result.stderr,/API_INTERNAL_URL/);
});
test('V8.5 UI requires password for irreversible account deletion',()=>{
  const client=source('apps/web/src/lib/api.ts');
  assert.match(client,/remove: \(password: string\)/);
  assert.match(client,/body: \{ password \}/);
  const modal=source('apps/web/src/components/auth-provider.tsx');
  assert.match(modal,/autoComplete="current-password"/);
  assert.match(modal,/onSubmit=\{deleteUser\}/);
});
test('V8.5 production validation occurs before Nest AppModule construction',()=>{
  const code=source('apps/api/src/main.ts');
  assert.ok(code.indexOf("if (prod &&") < code.indexOf('NestFactory.create'));
  assert.match(code,/enableShutdownHooks/);
});

test('V8.5 migrates DATE to calendar-specific string without modifying historical migration',()=>{
  const migration=source('infrastructure/db/003_lunar_date_storage.sql');
  assert.match(migration,/ALTER COLUMN birth_date TYPE VARCHAR\(10\)/);
  assert.match(migration,/to_char\(birth_date, 'YYYY-MM-DD'\)/);
  assert.match(source('apps/api/src/modules/charts/charts.service.ts'),/birth_date AS date/);
  const engine=require('../packages/astrology-engine/src/tuvi.js');
  assert.equal(engine.calculate({date:'2024-02-30',calendar:'lunar',leap:false,hour:8,minute:30,gender:'Nam'}).houses.length,12);
});

test('V8.5 readiness checks schema rather than only PostgreSQL connection',()=>{
  const health=source('apps/api/src/modules/health/health.controller.ts');
  assert.match(health,/information_schema\.columns/);
  assert.match(health,/data_type='character varying'/);
  assert.match(health,/if \(!rows\[0\]\?\.ready\) throw new ServiceUnavailableException/);
});
