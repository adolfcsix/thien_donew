'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {spawnSync}=require('node:child_process');
const root=join(__dirname,'..');
const M=require('../apps/web/src/features/mai-hoa/casting.cjs');
const {studyHref,readStudyInput,validSnapshot}=require('../apps/web/src/features/study-room/study-links.cjs');
const {gateSchoolExecution,getSchool}=require('../packages/knowledge/src/phase2-school-methods.cjs');
const inpt={objectTrigram:3,directionTrigram:8,hourBranch:7};
const cast=()=>M.castByLaterHeaven(inpt);
test('Hậu Thiên theo cổ văn: thượng vật, hạ phương, hào vật+phương+giờ',()=>{
 const r=cast();assert.equal(r.upper.name,'Ly');assert.equal(r.lower.name,'Khôn');
 assert.equal(r.original.name,'Hỏa Địa Tấn');assert.equal(r.changingLine,6);
 assert.equal(r.arithmetic.upperRemainder,3);assert.equal(r.arithmetic.lowerRemainder,8);
 assert.equal(r.arithmetic.movingSeed,18);assert.equal(r.arithmetic.changingRemainder,6);
 assert.equal(r.method,'later-heaven-object-direction-hour');
});
test('So sánh hai phương pháp giữ nguyên quẻ chủ nhưng có thể khác hào động',()=>{
 const c=M.compareLaterHeavenWithTwoNumbers(inpt);
 assert.equal(c.simple.changingLine,5);assert.equal(c.later.changingLine,6);
 assert.equal(c.sameOriginal,true);assert.equal(c.sameMovingLine,false);assert.equal(c.sameTransformed,false);
 assert.equal(c.difference.movingSeedDelta,7);assert.equal(c.verdict,null);
});
test('Giờ chi 6 và 12 đồng dư nên có cùng hào động như phép hai số',()=>{
 for(const h of [6,12]){
  const c=M.compareLaterHeavenWithTwoNumbers({...inpt,hourBranch:h});
  assert.equal(c.sameMovingLine,true);assert.equal(c.sameTransformed,true);
 }
});
test('Hào động từ 1..3: Dụng là hạ quái, Thể là thượng',()=>{
 const r=M.castByLaterHeaven({objectTrigram:1,directionTrigram:2,hourBranch:4});
 assert.equal(r.changingLine,1);assert.equal(r.body.name,'Càn');assert.equal(r.use.name,'Đoài');
});
test('Hào động từ 4..6: Dụng là thượng quái, Thể là hạ',()=>{
 const r=cast();assert.equal(r.changingLine,6);assert.equal(r.body.name,'Khôn');assert.equal(r.use.name,'Ly');
});
test('Hỗ quẻ giữ đúng hào 2-4 và 3-5 từ dưới lên',()=>{
 const r=cast();assert.equal(r.nuclear.bits,r.original.bits.slice(1,4)+r.original.bits.slice(2,5));
});
test('Chỉ lật đúng một hào, giữ bất biến năm hào khác',()=>{
 const r=cast();const diffs=[...r.original.bits].filter((x,i)=>x!==r.transformed.bits[i]);assert.equal(diffs.length,1);
 assert.notEqual(r.original.bits[r.changingLine-1],r.transformed.bits[r.changingLine-1]);
});
test('Đầu vào sai số quái vật phải từ chối, không đoán tượng',()=>{
 for(const x of [0,-1,9,1.5,'3',null,undefined,NaN,Infinity]) assert.throws(()=>M.castByLaterHeaven({...inpt,objectTrigram:x}),RangeError);
});
test('Đầu vào sai số quái phương vị phải từ chối, không đoán hướng la bàn',()=>{
 for(const x of [0,-1,9,1.5,'8',undefined]) assert.throws(()=>M.castByLaterHeaven({...inpt,directionTrigram:x}),RangeError);
});
test('Chi giờ chỉ chấp nhận số nguyên 1..12',()=>{
 for(const x of [0,13,1.2,'7',null,undefined]) assert.throws(()=>M.castByLaterHeaven({...inpt,hourBranch:x}),RangeError);
});
test('Không thay đổi hợp đồng khởi quẻ hiện có theo hai số',()=>{
 const r=M.castByNumbers({first:3,second:8});assert.equal(r.method,'two-number-sum');assert.equal(r.changingLine,5);
 assert.equal(r.original.bits,cast().original.bits);
});
test('Không thay đổi hợp đồng khởi quẻ theo lịch âm',()=>{
 const r=M.castByLunarTime({yearBranch:7,lunarMonth:8,lunarDay:15,hourBranch:7});
 assert.equal(r.method,'lunar-branch-sum');assert.equal(r.changingLine,1);
});
test('Lưu/khôi phục được đúng hồ sơ Hậu Thiên với nguồn số riêng',()=>{
 const snap={mode:'later-heaven',...inpt};assert.equal(validSnapshot('mai-hoa',snap),true);
 const href=studyHref('mai-hoa',snap);
 assert.match(href,/mode=later-heaven/);assert.deepEqual(readStudyInput('mai-hoa',href.slice(href.indexOf('?'))),snap);
});
test('Không nhận URL khôi phục bị thêm số quái quá phạm vi',()=>{
 for(const bad of [{...inpt,objectTrigram:9},{...inpt,hourBranch:0},{...inpt,directionTrigram:3.4}]){
  assert.equal(validSnapshot('mai-hoa',{mode:'later-heaven',...bad}),false);
  assert.equal(studyHref('mai-hoa',{mode:'later-heaven',...bad}),'/study');
 }
 assert.equal(readStudyInput('mai-hoa','?restore=1&mode=later-heaven&objectTrigram=1&directionTrigram=8&hourBranch=13'),null);
});
test('API xác thực đầu vào Hậu Thiên; kết quả tính toán của trình duyệt không gửi lên lưu trữ',()=>{
 const src=readFileSync(join(root,'apps/api/src/modules/study/study-validation.ts'),'utf8');
 assert.match(src,/\['time','numbers','later-heaven'\]/);
 for(const key of ['objectTrigram','directionTrigram','hourBranch'])assert.match(src,new RegExp(`number\\(input\\.${key}`));
});
test('Bảng chất lượng nhận diện đúng Hậu Thiên, không báo sai thành lịch âm',()=>{
 const {buildMaiHoaQuality}=require('../apps/web/src/features/reading-quality/quality.cjs');
 const q=buildMaiHoaQuality(cast());assert.match(q.method,/Hậu Thiên/);
 assert.match(q.items.find(x=>x.id==='calendar').evidence,/Vật tượng/);
 assert.doesNotMatch(q.items.find(x=>x.id==='calendar').evidence,/Hai con số/);
});
test('Trang Mai Hoa có 3 lựa chọn nhưng phép so sánh chỉ mở ở khu Chuyên sâu',()=>{
 const src=readFileSync(join(root,'apps/web/src/app/mai-hoa/page.tsx'),'utf8');
 assert.match(src,/setMode\('later-heaven'\)/);assert.match(src,/compareLaterHeavenWithTwoNumbers/);
 assert.match(src,/<ExpertOnly title="Đối chiếu phương pháp Hậu Thiên và hai số"/);
});
test('Bảng định nghĩa Hậu Thiên được giữ dưới research gate, không cấp quyền engine chính',()=>{
 const s=getSchool('mai-hoa-lunar-number');assert.equal(s.engineIntegration,'isolated-research-only');
 assert.equal(gateSchoolExecution(s.id).verdict,'RESEARCH_SUBROUTINE_ONLY');
 assert.ok(s.sources[0].startsWith('https://zh.wikisource.org/'));
 const engine=readFileSync(join(root,'packages/astrology-engine/src/tuvi.js'),'utf8');
 assert.doesNotMatch(engine,/later-heaven-object-direction-hour/);
});
test('Dữ liệu trả về không sinh nhãn dự đoán tốt xấu hay gán phán đoán',()=>{
 const r=cast(), c=M.compareLaterHeavenWithTwoNumbers(inpt);
 assert.ok(!Object.hasOwn(r,'fortune'));assert.ok(!Object.hasOwn(c,'prediction'));
 assert.equal(c.verdict,null);assert.ok(Object.isFrozen(r));assert.ok(Object.isFrozen(r.inputs));
});
test('Cổng phát hành tích hợp sử dụng kiểm thử chia nhóm để tránh treo test lồng',()=>{
 const gate=readFileSync(join(root,'infrastructure/scripts/verify-release.mjs'),'utf8');
 assert.match(gate,/audit-mai-hoa-later-heaven\.cjs/);
 assert.match(gate,/verify-test-shards\.mjs/);
 assert.match(gate,/240000/);
});
test('Toàn bộ 768 tổ hợp kiểm toán độc lập PASS và bao phủ 64 quẻ',()=>{
 const p=spawnSync(process.execPath,['infrastructure/scripts/audit-mai-hoa-later-heaven.cjs'],{cwd:root,encoding:'utf8',timeout:20000});
 assert.equal(p.status,0,p.stderr||p.stdout);assert.match(p.stdout,/"combinationCases":768/);assert.match(p.stdout,/"originalHexagrams":64/);
});
