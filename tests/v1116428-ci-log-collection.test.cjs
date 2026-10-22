'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, mkdtempSync, writeFileSync, chmodSync, readdirSync, existsSync, rmSync, mkdirSync} = require('node:fs');
const {join, resolve} = require('node:path');
const {tmpdir} = require('node:os');
const {spawnSync} = require('node:child_process');
const root=resolve(__dirname,'..');
const runner=readFileSync(join(root,'infrastructure/scripts/run-ci-http.sh'),'utf8');
const workflows=['ci.yml','bootstrap-lockfile.yml','production-acceptance.yml','v11163-guides-policy-ci.yml','v11164-v12-rc-audit.yml','v11162-ux-ci.yml','v11161-finance-ci.yml','v11157-158-forum-ci.yml'];
test('all eight E2E workflows collect failure logs from the CI temp directory',()=>{
  assert.match(runner,/RUNNER_TEMP/);
  assert.match(runner,/mktemp -d/);
  assert.match(runner,/CI API\/Web server logs retained/);
  for(const file of workflows){
    const yaml=readFileSync(join(root,'.github/workflows',file),'utf8');
    assert.ok(yaml.includes('${{ runner.temp }}/thiendo-ci-logs.*/*.log'),file);
    assert.doesNotMatch(yaml,/^\s+(?:api-ci|web-ci)\.log\s*$/m,file);
  }
});
const linux=process.platform!=='win32' && existsSync('/bin/bash') && spawnSync('sh',['-c','command -v setsid && command -v mktemp'],{encoding:'utf8'}).status===0;
test('failed E2E generates retrievable server logs in RUNNER_TEMP without touching source root',{skip:!linux},t=>{
  const workspace=mkdtempSync(join(tmpdir(),'thiendo-ci-logs-fixture-'));
  t.after(()=>rmSync(workspace,{recursive:true,force:true}));
  const bin=join(workspace,'bin');mkdirSync(bin);
  const node=join(bin,'node');
  writeFileSync(node,`#!/bin/sh
case "$*" in
 *wait-for-api.mjs*) flag="$RUNNER_TEMP/api-ready";;
 *wait-for-next.mjs*) flag="$RUNNER_TEMP/web-ready";;
 *next-proxy-smoke.mjs*) echo MOCK_PROXY_BLOCKED >&2; exit 27;;
 *) exit 0;;
esac
attempt=0
while [ ! -f "$flag" ]; do
 attempt=$((attempt+1))
 [ "$attempt" -le 100 ] || exit 29
 sleep 0.01
done
exit 0
`);
  chmodSync(node,0o755);
  const npm=join(bin,'npm');writeFileSync(npm,`#!/bin/sh
echo MOCK_SERVER_BOOT
case "$*" in *@thiendo/api*) touch "$RUNNER_TEMP/api-ready";; *@thiendo/web*) touch "$RUNNER_TEMP/web-ready";; esac
exit 0
`);chmodSync(npm,0o755);
  const result=spawnSync('bash',['infrastructure/scripts/run-ci-http.sh'],{
    cwd:root,encoding:'utf8',timeout:7000,
    env:{...process.env,RUNNER_TEMP:workspace,PATH:`${bin}:${process.env.PATH}`}
  });
  assert.equal(result.status,27,result.stderr || result.stdout);
  const folders=readdirSync(workspace).filter(n=>/^thiendo-ci-logs\./.test(n));
  assert.equal(folders.length,1);
  const files=readdirSync(join(workspace,folders[0])).sort();
  assert.deepEqual(files,['api-ci.log','web-ci.log']);
  assert.match(readFileSync(join(workspace,folders[0],'api-ci.log'),'utf8'),/MOCK_SERVER_BOOT/);
  assert.ok(!existsSync(join(root,'api-ci.log')));
  assert.ok(!existsSync(join(root,'web-ci.log')));
});
