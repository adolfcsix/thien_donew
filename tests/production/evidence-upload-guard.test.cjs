'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const workflow=fs.readFileSync(
 path.join(__dirname,'../../.github/workflows/production-acceptance.yml'),'utf8'
);
function checkPair(prefix,artifact,guardEnd){
 const p=workflow.indexOf('id: '+prefix+'_primary');
 const r=workflow.indexOf('id: '+prefix+'_retry',p);
 const g=workflow.indexOf('name: R43 require '+guardEnd,p);
 assert.ok(p>=0&&r>p&&g>r,prefix+' should have ordered primary, retry and guard');
 const primary=workflow.slice(p,r);
 const retry=workflow.slice(r,g);
 const guard=workflow.slice(g,workflow.indexOf('\n      - ',g+8));
 for(const section of [primary,retry]){
  assert.match(section,/uses: actions\/upload-artifact@v4/);
  assert.match(section,/continue-on-error: true/);
  assert.match(section,/if-no-files-found: error/);
  assert.ok(section.includes('name: '+artifact));
 }
 assert.ok(retry.includes("steps."+prefix+"_primary.outcome == 'failure'"));
 assert.match(retry,/overwrite: true/);
 assert.match(guard,/if: always\(\)/);
 assert.ok(guard.includes('steps.'+prefix+'_primary.outcome'));
 assert.ok(guard.includes('steps.'+prefix+'_retry.outcome'));
 assert.match(guard,/if \[ "\$PRIMARY" != success \] && \[ "\$RETRY" != success \]/);
 assert.match(guard,/exit 1/);
}
test('Evidence upload first and fallback attempts both fail closed',()=>{
 checkPair('r43_deep_artifact','deep-session-ai-regression-evidence','deep-session artifact upload success');
 checkPair('r43_http_artifact','browser-acceptance-evidence','HTTP browser artifact upload success');
 assert.match(workflow,/Native PostgreSQL logical backup and isolated restore drill/);
 assert.match(workflow,/Reject insecure production operation scripts/);
 assert.match(workflow,/npm run typecheck && npm run build/);
 assert.match(workflow,/npm run test:sharded/);
});
