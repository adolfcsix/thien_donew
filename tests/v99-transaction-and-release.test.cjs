'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
test('V9.9 register atomically inserts users/sessions and sets cookie only after transaction',()=>{
  const code=source('apps/api/src/modules/auth/auth.service.ts');
  const register=code.slice(code.indexOf('  async register('),code.indexOf('  async login('));
  assert.match(register,/await this\.db\.transaction/);
  assert.match(register,/INSERT INTO users/);
  assert.match(register,/INSERT INTO sessions/);
  assert.ok(register.indexOf('this.setSessionCookie')>register.indexOf('await this.db.transaction'));
  assert.ok(register.indexOf('this.setSessionCookie')>register.indexOf('throw error'));
});
test('V9.9 backup 64KiB JSON payload fits bounded API HTTP parser',()=>{
  const api=source('apps/api/src/main.ts');
  // Only the unscoped parser governs the backup endpoint; CMS has a separate route-scoped limit.
  const limit=Number(api.match(/app\.use\(json\(\{ limit: '(\d+)kb' \}\)\)/)?.[1]);
  assert.ok(limit>=64 && limit<=128,'General JSON parser must cover backups and remain bounded');
  assert.match(api,/app\.use\('\/api\/van-kho\/admin\/documents', json\(\{ limit: '256kb' \}\)\)/);
  assert.match(source('apps/api/src/modules/charts/charts.service.ts'),/65536/);
});
test('V9.9 includes source integrity and real-stack checks in CI',()=>{
  assert.ok(fs.existsSync(path.join(root,'infrastructure/scripts/check-source.mjs')));
  assert.ok(fs.existsSync(path.join(root,'infrastructure/scripts/diagnose-fullstack.mjs')));
  const ci=source('.github/workflows/ci.yml');
  assert.match(ci,/npm run check:source/);
  assert.match(ci,/npm run typecheck/);
  assert.match(ci,/npm run build/);
  assert.match(ci,/npm run db:migrate/);
  assert.match(ci,/run-ci-http\.sh/);
  assert.match(source('infrastructure/scripts/run-ci-http.sh'),/api-postgres-e2e\.test\.mjs/);
});
test('V9.9 frontend normalizes allowed WEB_ORIGIN before browser origin compare',()=>{
  assert.match(source('apps/api/src/main.ts'),/runtimeConfig\(process\.env\)/);
  assert.match(source('apps/api/src/common/runtime-config.ts'),/plainOrigin\('WEB_ORIGIN'/);
});
