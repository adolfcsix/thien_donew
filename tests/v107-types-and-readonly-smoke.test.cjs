'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=p=>readFileSync(join(root,p),'utf8');
test('V10.7 Nest auth controller accepts untrusted bodies as unknown all the way into service',()=>{
  const controller=read('apps/api/src/modules/auth/auth.controller.ts');
  const service=read('apps/api/src/modules/auth/auth.service.ts');
  assert.match(controller,/@Body\(\) body: unknown/);
  for(const signature of [
    'register(body: unknown, req: Request, res: Response)',
    'login(body: unknown, req: Request, res: Response)',
    'deleteAccount(req: Request, res: Response, body: unknown)'])assert.ok(service.includes(signature));
  assert.match(service,/function readLoginPayload\(body: unknown\)/);
  assert.match(service,/Array\.isArray\(body\)/);
});
test('V10.7 Next smoke has no POST or DELETE and leaves writes to guarded E2E after fingerprint match',()=>{
  const smoke=read('tests/next-proxy-smoke.mjs');
  const e2e=read('tests/api-postgres-e2e.test.mjs');
  assert.doesNotMatch(smoke,/method:\s*['"](?:POST|DELETE)['"]/);
  const identity=e2e.indexOf('assertMatchedApiInstance(verifiedDatabaseIdentity, proof.json)');
  const firstMutation=e2e.indexOf("const calculation=await request('/api/charts/calculate'");
  assert.ok(identity>=0 && firstMutation>identity);
  assert.match(e2e,/origin:'https:\/\/untrusted\.example\.invalid'/);
});
