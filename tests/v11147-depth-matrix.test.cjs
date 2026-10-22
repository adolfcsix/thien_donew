'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const data=rel=>JSON.parse(readFileSync(path.join(ROOT,rel),'utf8'));
const audit=data('docs/reference/source-depth-audit.json');
const matrix=data('packages/knowledge/src/development-matrix.json');
const editorial=data('packages/knowledge/src/research-disciplines.json');
const registry=data('packages/knowledge/src/depth-review-v11147.json');
test('V11.147: báo cáo kiểm kê lịch sử được bảo toàn; kiểm tra tái lập tại bản phát hành gốc',()=>{
 // V11.147 is an immutable baseline after subsequent releases, not a current-version audit.
 // Future releases run their own readiness checks instead of overwriting historical evidence.
 if(data('package.json').version!=='11.147.0'){
  assert.equal(audit.version,'11.147.0');
  assert.equal(audit.verdict,'SOURCE_INVENTORY_PASS');
  return;
 }
 const r=spawnSync(process.execPath,['infrastructure/scripts/audit-depth-v11147.cjs','--check'],{cwd:ROOT,encoding:'utf8',timeout:20000});
 assert.equal(r.status,0,`${r.stderr}\n${r.stdout}`);
 assert.match(r.stdout,/SOURCE_INVENTORY_PASS/);
});
test('V11.147: phân biệt tồn tại source với xác thực chuyên môn/runtime',()=>{
 assert.equal(audit.scope,'static-source-inventory-not-an-expert-review-or-a-runtime-test');
 assert.equal(audit.sourceEvidenceOnly,true);
 assert.equal(audit.summary.testsExecutedThisAudit,0);
 assert.ok(audit.records.every(x=>x.verification.independentMethod==='NOT_INDEPENDENTLY_VERIFIED'));
 assert.ok(audit.records.every(x=>x.verification.typecheckBuild==='NOT_RUNTIME_VERIFIED'));
 assert.equal(audit.verdict,'SOURCE_INVENTORY_PASS');
});
test('V11.147: 22 nhóm có độ ưu tiên, đường dẫn hoặc ngoại lệ có chủ đích',()=>{
 assert.equal(audit.records.length,matrix.records.length);
 assert.equal(new Set(audit.records.map(x=>x.id)).size,audit.records.length);
 assert.equal(audit.summary.matrixRecords,22);
 assert.equal(audit.summary.declaredRoutes,20);
 assert.equal(audit.summary.availableRouteFiles,20);
 assert.equal(audit.summary.missingEvidence,0);
 assert.equal(audit.summary.registryCapabilities,27);
 assert.ok(audit.records.every(x=>/P[0-3]/.test(x.priority)));
 assert.ok(audit.records.every(x=>x.evidence.missing.length===0));
 const rune=audit.records.find(x=>x.id==='rune');
 assert.equal(rune.route.path,null);
 assert.equal(rune.declared.calculator,'planned');
 assert.equal(audit.records.find(x=>x.id==='runtime').route.path,null);
});
test('V11.147: phát hiện ca nguy cơ không bị che bởi trạng thái SOURCE_INVENTORY_PASS',()=>{
 const get=id=>audit.records.find(x=>x.id===id);
 assert.equal(get('runtime').priority,'P0');
 assert.equal(get('account').priority,'P0');
 assert.match(get('luc-nham').action,/lệch 1 ca/);
 assert.equal(get('thiet-ban').declared.calculator,'research-only');
 assert.match(get('tu-vi').limits,/11 tên/);
 assert.match(get('ha-lac').limits,/Tam Nguyên/);
 assert.match(get('tu-binh').action,/PostgreSQL/);
});
test('V11.147: cập nhật nội dung Đại Lục Nhâm, vẫn công khai giới hạn đối chứng',()=>{
 assert.equal(editorial.edition,'11.147.0');
 assert.equal(matrix.release,'11.147.0');
 const l=editorial.records.find(x=>x.id==='luc-nham');
 assert.match(l.boundary,/V11\.144/);
 assert.match(l.boundary,/lệch 1 nhánh/);
 assert.doesNotMatch(l.boundary,/Thiệp Hại và các ca dị bản chưa tự giải/);
});
test('V11.147: định danh đầy đủ và không tự nâng planned lên source-implemented',()=>{
 assert.deepEqual(new Set(registry.queue.map(x=>x.id)),new Set(matrix.records.map(x=>x.id)));
 assert.deepEqual(new Set(Object.keys(registry.evidenceTestFiles)),new Set(matrix.records.map(x=>x.id)));
 for(const r of audit.records){
  assert.ok(r.candidateTests.every(t=>t.sourcePresent && !t.executedThisAudit));
  assert.ok(r.action.length>20);
 }
 assert.ok(!audit.records.some(x=>x.verification.independentMethod==='VERIFIED'));
});
