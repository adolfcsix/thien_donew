const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Private GitHub upload requires explicit opt-in, without hardcoding credentials',()=>{
 const s=read('infrastructure/scripts/launch-github-build.ps1');
 assert.match(s,/Read-Host 'Type PRIVATE/);
 assert.match(s,/--private --source=\. --remote=origin --push/);
 assert.match(s,/gh auth status/);
 assert.match(s,/Get-Command/);
 assert.doesNotMatch(s,/(\$env:GITHUB_TOKEN\s*=|gh auth login --with-token)/);
});
test('Upload blocks secret filenames and existing repository checkout',()=>{
 const s=read('infrastructure/scripts/launch-github-build.ps1');
 assert.match(s,/Test-Path '\.git'/);
 assert.match(s,/\$unsafe/);
 assert.match(s,/NO PUSH occurred/);
 const ign=read('.gitignore');
 for(const pattern of ['.env.*','!.env.example','.npmrc','*.pem','docs/reports/'])assert.ok(ign.includes(pattern),pattern);
});
test('GitHub workflow boots a real lockfile then installs and builds with test PostgreSQL',()=>{
 const yml=read('.github/workflows/bootstrap-lockfile.yml');
 assert.match(yml,/workflow_dispatch:/);
 assert.match(yml,/npm install --package-lock-only/);
 assert.match(yml,/npm ci/);
 assert.match(yml,/npm run typecheck && npm run build/);
 assert.match(yml,/postgres:16-alpine/);
 assert.match(yml,/run-ci-http\.sh/);
 const runner=read('infrastructure/scripts/run-ci-http.sh');
 assert.match(runner,/api-postgres-e2e\.test\.mjs/);
});
test('Result tool downloads selected artifact and validates lockfile',()=>{
 const s=read('infrastructure/scripts/get-github-build-results.ps1');
 assert.match(s,/thien-do-npm-lockfile/);
 assert.match(s,/import-lockfile\.mjs --candidate \$candidate --apply/);
 assert.match(read('infrastructure/scripts/import-lockfile.mjs'),/validateLockFile/);
 assert.match(s,/--log-failed/);
});
