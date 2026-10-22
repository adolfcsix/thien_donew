import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import studyLinks from '../apps/web/src/features/study-room/study-links.cjs';
import formationEngine from '../apps/web/src/features/ky-mon/formation.cjs';
import hourEngine from '../apps/web/src/features/ky-mon/hour-plate.cjs';
import signalEngine from '../apps/web/src/features/ky-mon/hour-signals.cjs';
import { assertSafeE2ETarget } from '../infrastructure/scripts/e2e-guard.mjs';
import { localE2EFetch, localTestOrigin } from '../infrastructure/scripts/e2e-http.mjs';
import { cleanupDisposableTestAccounts } from '../infrastructure/scripts/e2e-account-cleanup.mjs';
const expectedTarget = assertSafeE2ETarget();
// Direct npm run test:e2e must also fail closed if connected to a nonempty DB.
// This verifier checks the live PostgreSQL connection, not merely the URL suffix.
import { verifiedDatabaseIdentity } from '../infrastructure/scripts/check-e2e-database.mjs';
import { assertMatchedApiInstance } from '../infrastructure/scripts/e2e-db-policy.mjs';
const BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8080';
if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(BASE)) throw Error('Destructive E2E API must be local only');
localTestOrigin(BASE);
async function request(path,{method='GET',body,cookie,origin}={}) {
  const res=await localE2EFetch(BASE,path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(origin?{origin}:{})},body:body?JSON.stringify(body):undefined});
  const json=await res.json();
  return { status:res.status, json, cookie:(res.headers.get('set-cookie')||'').split(';')[0] };
}
test('V8.1 register/login/ownership/save/read/delete end to end with PostgreSQL', async () => {
  const suffix=randomUUID().slice(0,16);
  const emailA=`test-a-${suffix}@example.invalid`,emailB=`test-b-${suffix}@example.invalid`;
  const password=`STRONG!${randomUUID()}!`;
  const input={label:'Lá số kiểm thử',date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'};
  let cookieA='',cookieB='';
  const accounts = [{email:emailA,password,registered:false,cookie:''}, {email:emailB,password,registered:false,cookie:''}];
  try {
    // Fail BEFORE the first POST if the live API uses a different database.
    // This check is mandatory even when tests are invoked directly via npm.
    const proof=await request('/api/health/e2e');
    assert.equal(proof.status,200,'API is not opted into isolated E2E mode');
    assert.equal(proof.json?.database, expectedTarget.databaseName);
    // Name alone is insufficient: two local PostgreSQL clusters can both have
    // a database named thiendo_test. Compare the actual server instance too.
    assertMatchedApiInstance(verifiedDatabaseIdentity, proof.json);
    const ready=await request('/api/health/ready');assert.equal(ready.status,200);
    const anonymousCalculation=await request('/api/charts/calculate',{method:'POST',body:input});assert.equal(anonymousCalculation.status,401);
    const csrf=await request('/api/charts/calculate',{method:'POST',body:input,origin:'https://untrusted.example.invalid'});assert.equal(csrf.status,403);
    const a=await request('/api/auth/register',{method:'POST',body:{email:emailA,password}});
    assert.equal(a.status,201);cookieA=a.cookie;accounts[0].registered=true;accounts[0].cookie=cookieA;assert.match(cookieA,/thiendo_session=/);
    const calculation=await request('/api/charts/calculate',{method:'POST',body:input,cookie:cookieA});assert.equal(calculation.status,200);assert.equal(calculation.json.result.houses.length,12);
    const b=await request('/api/auth/register',{method:'POST',body:{email:emailB,password}});
    assert.equal(b.status,201);cookieB=b.cookie;accounts[1].registered=true;accounts[1].cookie=cookieB;
    const unauth=await request('/api/charts');assert.equal(unauth.status,401);
    const create=await request('/api/charts',{method:'POST',body:input,cookie:cookieA});assert.equal(create.status,201);
    const id=create.json.id;assert.match(id,/^[0-9a-f-]{36}$/i);
    const own=await request(`/api/charts/${id}`,{cookie:cookieA});assert.equal(own.status,200);assert.equal(own.json.chart.label,input.label);assert.equal(own.json.result.houses.length,12);
    const blocked=await request(`/api/charts/${id}`,{cookie:cookieB});assert.equal(blocked.status,404);
    // V11.107: exercise actual study storage, ownership and reproducible Kỳ Môn inputs.
    const noStudy=await request('/api/study');assert.equal(noStudy.status,401);
    const snapshots=[
      {mode:'manual',withHour:true,solarTermIndex:3,dayCycleIndex:52,hourBranchIndex:5},
      {mode:'manual',withHour:false,solarTermIndex:12,dayCycleIndex:14,hourBranchIndex:0},
      {mode:'auto',withHour:true,date:'2026-10-12',hour:23,minute:15,dayBoundary:'late-zi',lateZiAcknowledged:true},
      {mode:'auto',withHour:true,date:'2026-10-12',hour:23,minute:15,dayBoundary:'midnight'}
    ];
    for(const snapshot of snapshots){
      const draft={discipline:'ky-mon',title:'Kỳ Môn E2E',summary:'Isolated round trip',snapshot:{...snapshot,forgedResult:'discard me'}};
      const saved=await request('/api/study',{method:'POST',cookie:cookieA,body:draft});assert.equal(saved.status,201);
      const studyId=saved.json.id;
      const fetched=await request(`/api/study/${studyId}`,{cookie:cookieA});assert.equal(fetched.status,200);
      assert.deepEqual(fetched.json.entry.snapshot,snapshot);
      const link=studyLinks.studyHref('ky-mon',fetched.json.entry.snapshot);
      const restored=studyLinks.readStudyInput('ky-mon',new URL(link,'http://localhost').search);
      assert.deepEqual(restored,snapshot);
      if(snapshot.mode==='manual'){
        const make=input=>formationEngine.makeBaseFormation({solarTermIndex:input.solarTermIndex,dayCycleIndex:input.dayCycleIndex,
          hourCycleIndex:input.withHour?formationEngine.hourForDayBranch(input.dayCycleIndex,input.hourBranchIndex).index:null});
        assert.deepEqual(make(restored),make(snapshot));
        if(snapshot.withHour){const base=make(restored);assert.deepEqual(signalEngine.analyzeHourSignals(base,hourEngine.buildRotatingHourPlate(base)),
          signalEngine.analyzeHourSignals(make(snapshot),hourEngine.buildRotatingHourPlate(make(snapshot))));}
      }
      for(const method of ['GET','PATCH','DELETE']){
        const denied=await request(`/api/study/${studyId}`,{method,cookie:cookieB,...(method==='PATCH'?{body:{title:'unauthorized'}}:{})});
        assert.equal(denied.status,404);
      }
      const changed=await request(`/api/study/${studyId}`,{method:'PATCH',cookie:cookieA,body:{notes:'Đối chiếu Kỳ Môn',pinned:true}});assert.equal(changed.status,200);
      const immutable=await request(`/api/study/${studyId}`,{method:'PATCH',cookie:cookieA,body:{snapshot:{}}});assert.equal(immutable.status,400);
      assert.deepEqual((await request(`/api/study/${studyId}`,{cookie:cookieA})).json.entry.snapshot,snapshot);
      assert.ok((await request('/api/study',{cookie:cookieA})).json.entries.some(entry=>entry.id===studyId));
      assert.equal((await request(`/api/study/${studyId}`,{method:'DELETE',cookie:cookieA})).status,200);
      assert.equal((await request(`/api/study/${studyId}`,{cookie:cookieA})).status,404);
    }
    // V11.121: Tarot native HTTP ownership and immutable draw, never redraw on reopen.
    const tarotSnapshot={version:1,deck:'rider-waite-smith-1909',spread:'three',includeReversed:true,question:'Native isolated round trip',draw:[{id:'major-00',reversed:false},{id:'cups-02',reversed:true},{id:'swords-10',reversed:false}]};
    const tarotSaved=await request('/api/study',{method:'POST',cookie:cookieA,body:{discipline:'tarot',title:'Tarot E2E',snapshot:{...tarotSnapshot,forgedResult:999}}});assert.equal(tarotSaved.status,201);
    const tarotId=tarotSaved.json.id;
    for(let repeat=0;repeat<2;repeat++)assert.deepEqual((await request(`/api/study/${tarotId}`,{cookie:cookieA})).json.entry.snapshot,tarotSnapshot);
    for(const method of ['GET','PATCH','DELETE'])assert.equal((await request(`/api/study/${tarotId}`,{method,cookie:cookieB,...(method==='PATCH'?{body:{title:'unauthorized'}}:{})})).status,404);
    assert.equal((await request(`/api/study/${tarotId}`,{method:'PATCH',cookie:cookieA,body:{snapshot:{...tarotSnapshot,draw:[]}}})).status,400);
    assert.equal((await request('/api/study',{method:'POST',cookie:cookieA,body:{discipline:'tarot',title:'Invalid duplicate',snapshot:{...tarotSnapshot,draw:[tarotSnapshot.draw[0],tarotSnapshot.draw[0],tarotSnapshot.draw[2]]}}})).status,400);
    assert.equal((await request(`/api/study/${tarotId}`,{method:'DELETE',cookie:cookieA})).status,200);
    // V11.114.1: study backup import must be one PostgreSQL transaction,
    // not a sequence of client-side POST/PATCH calls.
    const studyBefore=(await request('/api/study',{cookie:cookieA})).json.entries.length;
    const studyEntry={discipline:'mai-hoa',title:'Nhập giao dịch',summary:'Nguồn độc lập',notes:'ghi chú',
      tags:['đối chiếu'],snapshot:{mode:'numbers',first:3,second:8,forgedResult:999},pinned:true,
      id:'stolen-id',user_id:'other-user'};
    const studyImportId=randomUUID();
    const studyBackup={format:'thien-do.study-export',version:1,importId:studyImportId,entries:[studyEntry,{...studyEntry,title:'Hồ sơ số hai',pinned:false}]};
    assert.equal((await request('/api/study/import',{method:'POST',body:studyBackup})).status,401);
    assert.equal((await request('/api/study/import',{method:'POST',body:{...studyBackup,entries:[studyEntry,{...studyEntry,title:' '}]},cookie:cookieA})).status,400);
    assert.equal((await request('/api/study',{cookie:cookieA})).json.entries.length,studyBefore,
      'validation of the second row must precede all inserts');
    const importedStudy=await request('/api/study/import',{method:'POST',body:studyBackup,cookie:cookieA});
    assert.equal(importedStudy.status,201);assert.equal(importedStudy.json.imported,2);
    assert.equal(importedStudy.json.replayed,false);
    const receipt=await request(`/api/study/import/${studyImportId}`,{cookie:cookieA});
    assert.equal(receipt.status,200);assert.equal(receipt.json.imported,2);
    assert.equal((await request(`/api/study/import/${studyImportId}`,{cookie:cookieB})).status,404);
    const replay=await request('/api/study/import',{method:'POST',body:studyBackup,cookie:cookieA});
    assert.equal(replay.status,201);assert.equal(replay.json.imported,2);assert.equal(replay.json.replayed,true);
    assert.equal((await request('/api/study/import',{method:'POST',body:{...studyBackup,entries:[{...studyEntry,title:'Different'}]},cookie:cookieA})).status,409);
    const studyAfter=(await request('/api/study',{cookie:cookieA})).json.entries;
    const newStudies=studyAfter.filter(entry=>['Nhập giao dịch','Hồ sơ số hai'].includes(entry.title));
    assert.equal(newStudies.length,2);assert.equal(newStudies.find(entry=>entry.title==='Nhập giao dịch').pinned,true);
    assert.equal(newStudies.find(entry=>entry.title==='Hồ sơ số hai').pinned,false);
    assert.ok(newStudies.every(entry=>entry.id!=='stolen-id'&&entry.snapshot.forgedResult===undefined));
    assert.ok((await request('/api/study',{cookie:cookieB})).json.entries.every(entry=>!['Nhập giao dịch','Hồ sơ số hai'].includes(entry.title)));
    for(const entry of newStudies)assert.equal((await request(`/api/study/${entry.id}`,{method:'DELETE',cookie:cookieA})).status,200);
    const invalidId=await request('/api/charts/not-a-uuid',{cookie:cookieA});assert.equal(invalidId.status,400);
    const invalidDelete=await request('/api/charts/not-a-uuid',{cookie:cookieA,method:'DELETE'});assert.equal(invalidDelete.status,400);
    const forbiddenDelete=await request(`/api/charts/${id}`,{cookie:cookieB,method:'DELETE'});assert.equal(forbiddenDelete.status,404);
    const accountDeletionNoPassword=await request('/api/auth/account',{method:'DELETE',cookie:cookieB});assert.equal(accountDeletionNoPassword.status,400);
    const accountDeletionWrongPassword=await request('/api/auth/account',{method:'DELETE',cookie:cookieB,body:{password:'wrong-password'}});assert.equal(accountDeletionWrongPassword.status,401);
    const accountStillExists=await request('/api/auth/me',{cookie:cookieB});assert.equal(accountStillExists.status,200);assert.equal(accountStillExists.json.user.email,emailB);
    const mine=await request('/api/charts',{cookie:cookieA});assert.equal(mine.status,200);assert.ok(mine.json.charts.some(c=>c.id===id));
    const invalid=await request('/api/charts',{cookie:cookieA,method:'POST',body:{...input,date:'2026-02-30'}});assert.equal(invalid.status,400);
    // V8.9 restores a V8.4+ JSON export atomically, only to the authenticated owner.
    const backup={format:'thien-do.saved-charts',version:1,charts:[
      {...input,label:'E2E restored',id:randomUUID(),user_id:'attacker',stars:['forged']},
      {...input,label:'E2E restored',id:randomUUID()}
    ]};
    const forbiddenImport=await request('/api/charts/import',{method:'POST',body:backup});assert.equal(forbiddenImport.status,401);
    const restored=await request('/api/charts/import',{method:'POST',cookie:cookieA,body:backup});
    assert.equal(restored.status,200);assert.equal(restored.json.imported,1);assert.equal(restored.json.skipped,1);
    const repeat=await request('/api/charts/import',{method:'POST',cookie:cookieA,body:backup});
    assert.equal(repeat.json.imported,0);assert.equal(repeat.json.skipped,2);
    const bImportList=await request('/api/charts',{cookie:cookieB});assert.equal(bImportList.json.charts.length,0);
    const restoredItem=(await request('/api/charts',{cookie:cookieA})).json.charts.find(c=>c.label==='E2E restored');
    assert.ok(restoredItem);assert.notEqual(restoredItem.id,backup.charts[0].id);
    const badBackup=await request('/api/charts/import',{method:'POST',cookie:cookieA,body:{...backup,charts:[...backup.charts,{...input,label:'bad',date:'2026-02-30'}]}});
    assert.equal(badBackup.status,400);
    const afterBad=(await request('/api/charts',{cookie:cookieA})).json.charts;
    assert.equal(afterBad.filter(c=>c.label==='bad').length,0);
    await request(`/api/charts/${restoredItem.id}`,{cookie:cookieA,method:'DELETE'});
    const lunar={...input,label:'Ngày âm 30/02',calendar:'lunar',date:'2024-02-30'};
    const lunarSave=await request('/api/charts',{cookie:cookieA,method:'POST',body:lunar});assert.equal(lunarSave.status,201);
    const lunarGet=await request(`/api/charts/${lunarSave.json.id}`,{cookie:cookieA});assert.equal(lunarGet.status,200);assert.equal(lunarGet.json.chart.date,'2024-02-30');
    await request(`/api/charts/${lunarSave.json.id}`,{cookie:cookieA,method:'DELETE'});
    const remove=await request(`/api/charts/${id}`,{cookie:cookieA,method:'DELETE'});assert.equal(remove.status,200);
    const gone=await request(`/api/charts/${id}`,{cookie:cookieA});assert.equal(gone.status,404);
    const signedOut=await request('/api/auth/logout',{cookie:cookieA,method:'POST'});assert.equal(signedOut.status,200);
    const cantRead=await request('/api/charts',{cookie:cookieA});assert.equal(cantRead.status,401);
    const login=await request('/api/auth/login',{method:'POST',body:{email:emailA,password}});assert.equal(login.status,200);cookieA=login.cookie;
  } finally {
    // The original A cookie may have been invalidated by logout. The cleanup
    // helper reauthenticates if needed, then reports any remaining test users.
    accounts[0].cookie = cookieA;
    accounts[1].cookie = cookieB;
    await cleanupDisposableTestAccounts(request, accounts);
  }
});
