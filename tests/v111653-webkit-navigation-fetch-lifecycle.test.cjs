'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

test('anonymous page-view telemetry is best-effort and not physically aborted on route unmount',()=>{
 const source=read('apps/web/src/components/page-view-recorder.tsx');
 assert.match(source,/navigator\.doNotTrack === '1'/);
 assert.match(source,/pathname\.startsWith\('\/admin'\)/);
 assert.match(source,/credentials: 'omit'/);
 assert.match(source,/keepalive: true/);
 assert.match(source,/method: 'POST'/);
 assert.match(source,/void fetch\('\/api\/analytics\/page-view'/);
 assert.match(source,/\.catch\(\(\) =>/);
 assert.doesNotMatch(source,/new AbortController\(|\.abort\(\)|signal:\s*controller\.signal/);
});

test('read-only PremiumLock ignores stale async completion without canceling transport',()=>{
 const source=read('apps/web/src/features/community-hub/premium.tsx');
 const lock=source.split('export function PremiumLock')[1].split('export function PremiumGate')[0];
 assert.match(lock,/let active=true/);
 assert.match(lock,/if\(active\)setStatus/);
 assert.match(lock,/return\(\)=>\{active=false\}/);
 assert.match(lock,/keepalive:true,timeoutMs:12000/);
 assert.match(lock,/timeoutMs:12000/);
 assert.match(lock,/\.catch\(\(\)=>/);
 assert.doesNotMatch(lock,/new AbortController\(|\.abort\(\)|signal:\s*c\.signal/);
 // The privileged content gate still enforces server-computed access, 401 handling,
 // a bounded deadline and cancellation; only the decorative icon read differs.
 const gate=source.split('export function PremiumGate')[1];
 assert.match(gate,/new AbortController\(/);
 assert.match(gate,/\/api\/community\/premium-access\?path=/);
 assert.match(gate,/signal:c\.signal,timeoutMs:15000/);
 assert.match(gate,/return\(\)=>c\.abort\(\)/);
 assert.match(gate,/r\.allowed===true/);
});

test('WebKit touch acceptance still checks page errors on registration, login and inbox',()=>{
 const source=read('tests/helpers-touch-compat-browser.cjs');
 assert.match(source,/Unexpected JavaScript error during registration-to-chart navigation/);
 assert.match(source,/Unexpected JavaScript error from the signed-in chart/);
 assert.match(source,/Unexpected browser error from the inbox while it is stable/);
 assert.match(source,/Unexpected browser error from the inbox during inbox-to-study navigation/);
 assert.match(source,/pageErrors\.push\(e\.message\)/);
});


test('WebKit inbox polling uses a bounded keepalive GET without losing stale-response and unmount guards',()=>{
 const inbox=read('apps/web/src/features/community-hub/messages.tsx');
 const list=inbox.split('const loadList=useCallback')[1].split('const loadDetail=useCallback')[0];
 assert.match(list,/if\(signal\.aborted\)return/);
 assert.match(list,/\{keepalive:true,timeoutMs:15000\}/);
 assert.match(list,/listRequest\.current\.isCurrent\(request,signal\)/);
 assert.doesNotMatch(list,/\{signal,timeoutMs:15000\}/);
 const api=read('apps/web/src/lib/api.ts');
 assert.match(api,/keepalive\?: boolean/);
 assert.match(api,/keepalive: options\.keepalive === true/);
 assert.match(api,/options\.keepalive && .* !== 'GET'/);
 assert.match(api,/options\.keepalive && .*options\.signal/);
 // No change to the message-send mutation's cancellation contract.
 assert.match(inbox,/method:'POST',body:\{body:text,clientId:key\},signal,timeoutMs:15000/);
 // Keep the strict WebKit pageerror check; never waive known failures.
 const testBrowser=read('tests/helpers-touch-compat-browser.cjs');
 assert.match(testBrowser,/Unexpected browser error from the inbox during inbox-to-study navigation/);
});
