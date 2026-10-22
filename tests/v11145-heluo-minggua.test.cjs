'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const R=path.resolve(__dirname,'..');
const HE=require('../packages/astrology-engine/src/ha-lac-minggua-v11145.cjs');
const OLD=require('../packages/astrology-engine/src/ha-lac-source.cjs');
const HEX=require('../apps/web/src/features/iching/hexagrams.cjs');
const LINKS=require('../apps/web/src/features/study-room/study-links.cjs');
const BACKUP=require('../apps/web/src/features/study-room/study-backup.cjs');
// This external expected sample is recorded in 卷一 of 河洛理數,
// https://www.shidianguji.com/book/NA09030/chapter/1m8od60nhc1me
const classic={pillars:['Giáp Tý','Đinh Mão','Canh Thân','Canh Thìn'],profile:{gender:'male'}};
const old={pillars:['Nhâm Ngọ','Tân Hợi','Đinh Hợi','Kỷ Dậu']};
test('V11.145: độc lập với engine 11.136 và dùng phép giảm 25/30, mốc 10/20',()=>{
 assert.equal(OLD.calculate(old).heaven.sum,34);assert.equal(OLD.calculate(old).earth.sum,28);
 assert.equal(OLD.calculate(old).hexagram,null);
 assert.equal(HE.reduceNumber(25,'heaven').number,5);
 assert.equal(HE.reduceNumber(30,'earth').number,3);
 assert.equal(HE.reduceNumber(35,'heaven').number,1);
 assert.equal(HE.reduceNumber(40,'earth').number,1);
 assert.equal(HE.reduceNumber(50,'earth').number,2);
 assert.equal(HE.reduceNumber(60,'earth').number,3);
 assert.equal(HE.reduceNumber(20,'heaven').number,2);
 assert.throws(()=>HE.reduceNumber(0,'earth'));assert.throws(()=>HE.reduceNumber(1,'unknown'));
});
test('V11.145: ca cổ Giáp Tý Đinh Mão Canh Thân Canh Thìn: Cấu -> Nguyên Đường 6 -> Trung Phu',()=>{
 const r=HE.calculateMinggua(classic);assert.equal(r.status,'CANDIDATE_COMPLETE');
 assert.deepEqual([r.numbering.heaven.total,r.numbering.earth.total],[31,34]);
 assert.equal(r.early.bits,'011111');assert.equal(HEX.hexagramFromBits(r.early.bits).number,44);
 assert.equal(r.yuanTang.line,6);assert.equal(r.later.bits,'110011');
 assert.equal(HEX.hexagramFromBits(r.later.bits).number,61);assert.equal(r.later.yuanTangLine,3);
 assert.equal(r.researchOnly,true);
});
test('V11.145: đảo vị trí thượng/hạ theo âm dương năm và nam nữ, không đổi số Thiên/Địa',()=>{
 for(const [gender,above] of [['male',true],['female',false]]){
  const r=HE.calculateMinggua({...classic,profile:{gender}});
  assert.equal(r.early.heavenAbove,above);
 }
 const yin={pillars:['Ất Sửu','Đinh Mão','Kỷ Dậu','Tân Mùi']};
 assert.equal(HE.calculateMinggua({...yin,profile:{gender:'male'}}).early?.heavenAbove??null, false);
 assert.equal(HE.calculateMinggua({...yin,profile:{gender:'female'}}).early?.heavenAbove??null,true);
});
test('V11.145: không tự suy Tam Nguyên khi gặp số 5; phân bảng ký cung có chứng bản',()=>{
 const raw=HE.calculateMinggua({pillars:classic.pillars});assert.equal(raw.status,'NEEDS_GENDER');
 assert.equal(HE.centerTrigram({gender:'male',period:'upper'},true),8);
 assert.equal(HE.centerTrigram({gender:'female',period:'upper'},true),2);
 assert.equal(HE.centerTrigram({gender:'male',period:'middle'},true),8);
 assert.equal(HE.centerTrigram({gender:'male',period:'middle'},false),2);
 assert.equal(HE.centerTrigram({gender:'female',period:'middle'},false),8);
 assert.equal(HE.centerTrigram({gender:'male',period:'lower'},true),9);
 assert.equal(HE.centerTrigram({gender:'female',period:'lower'},true),7);
 assert.throws(()=>HE.validateProfile({gender:'male',period:'middle'}));
 assert.throws(()=>HE.validateProfile({gender:'male',period:'upper',periodReferenceId:'xx',periodReferenceDetail:'Chapter 1'}));
 assert.throws(()=>HE.validateProfile({gender:'male',periodReferenceId:'TEXT'}));
 assert.throws(()=>HE.validateProfile({gender:'other'}));
 assert.equal(HE.validateProfile({gender:'male'}).gender,'male');
});
test('V11.145: nguồn Nguyên Đường, 1/2/3/4/5 hào và trường hợp thuần quẻ',()=>{
 assert.deepEqual(HE.placeYuanTang('010000','Tý').trace.map(x=>x.line),[2,2,1,3,4,5]); // Sư - 1 hào dương
 assert.deepEqual(HE.placeYuanTang('000110','Tý').trace.map(x=>x.line),[4,5,4,5,1,2]); // Tụy - 2 hào dương
 assert.deepEqual(HE.placeYuanTang('011001','Tý').trace.map(x=>x.line),[2,3,6,2,3,6]); // Cổ - 3 hào dương
 assert.deepEqual(HE.placeYuanTang('010000','Ngọ').trace.map(x=>x.line),[1,3,4,5,6,2]); // 5 âm
 assert.deepEqual(HE.placeYuanTang('000100','Ngọ').trace.map(x=>x.line),[1,2,3,5,6,4]); // Dự - 5 âm
 assert.equal(HE.placeYuanTang('111111','Tý').status,'PENDING_PURE_HEXAGRAM_RULE');
 assert.equal(HE.placeYuanTang('000000','Hợi').line,null);
 assert.throws(()=>HE.placeYuanTang('123456','Tý'));
 assert.throws(()=>HE.placeYuanTang('010000','abc'));
});
test('V11.145: phép Hậu Thiên lật một hào rồi tráo thượng/hạ, không đột biến input',()=>{
 const a=HE.nextHeavenHexagram('011111',6);
 assert.equal(a.changedBeforeSwap,'011110');assert.equal(a.bits,'110011');assert.equal(a.yuanTangLine,3);
 const b=HE.nextHeavenHexagram('010001',1);assert.equal(b.yuanTangLine,4);
 assert.throws(()=>HE.nextHeavenHexagram('010001',7));
});
test('V11.145: 60 hoa giáp x 2 giới tính, engine deterministic không biến dạng quẻ',()=>{
 const cycle=require('../packages/astrology-engine/src/traditional-calendar-audit.cjs').CYCLE;
 let count=0;
 for(const year of cycle)for(const gender of ['male','female']){
  const spec={pillars:[year.name,'Ất Sửu','Bính Dần','Đinh Mão'],profile:{gender}};
  const r=HE.calculateMinggua(spec);
  assert.ok(['NEEDS_PERIOD','PENDING_PURE_HEXAGRAM_RULE','CANDIDATE_COMPLETE'].includes(r.status));
  if(r.early){assert.match(r.early.bits,/^[01]{6}$/);const h=HEX.hexagramFromBits(r.early.bits);assert.ok(h&&h.number>=1&&h.number<=64);count++;}
  if(r.later)assert.ok(HEX.hexagramFromBits(r.later.bits));
 }
 assert.ok(count>50);
});
test('V11.145: Thư phòng và backup chấp nhận snapshot mới/legacy; URL roundtrip; không nhận period giả',()=>{
 for(const x of [old,classic]){
  assert.equal(LINKS.validSnapshot('ha-lac',x),true);
  const href=LINKS.studyHref('ha-lac',x);
  assert.ok(href.startsWith('/ha-lac?'));
  assert.deepEqual(LINKS.readStudyInput('ha-lac',href.split('?')[1]),x);
  const entries=BACKUP.parseStudyBackup({format:BACKUP.FORMAT,version:BACKUP.VERSION,entries:[{discipline:'ha-lac',title:'Hà Lạc',summary:'',notes:'',tags:[],pinned:false,snapshot:x}]});
  assert.deepEqual(entries[0].snapshot,x);
 }
 const invalid={...classic,profile:{gender:'male',period:'middle'}};
 assert.equal(LINKS.validSnapshot('ha-lac',invalid),false);
 assert.equal(LINKS.readStudyInput('ha-lac',LINKS.studyHref('ha-lac',invalid).split('?')[1]),null);
});
test('V11.145: ba ví dụ nguồn ngoài đối chiếu với expected viết tay',()=>{
 const {examples}=JSON.parse(fs.readFileSync(path.join(R,'packages/astrology-engine/fixtures/v11145-heluo-external-examples.json'),'utf8'));
 assert.equal(examples.length,3);
 for(const sample of examples){
  const r=HE.calculateMinggua({pillars:sample.pillars,profile:{gender:sample.gender}});
  assert.equal(r.numbering.heaven.total,sample.heaven,sample.id);
  assert.equal(r.numbering.earth.total,sample.earth,sample.id);
  if(sample.earlyKingWen)assert.equal(HEX.hexagramFromBits(r.early.bits).number,sample.earlyKingWen,sample.id);
  if(sample.yuanTangLine)assert.equal(r.yuanTang.line,sample.yuanTangLine,sample.id);
  if(sample.lateKingWen)assert.equal(HEX.hexagramFromBits(r.later.bits).number,sample.lateKingWen,sample.id);
  if(sample.lateYuanTangLine)assert.equal(r.later.yuanTangLine,sample.lateYuanTangLine,sample.id);
 }
});
test('V11.145: thực sự chặn số 5 đến khi có chứng bản Tam Nguyên; thuần quẻ chặn dù đủ giới tính',()=>{
 const pillars=['Giáp Tý','Giáp Tý','Bính Dần','Đinh Mão'];
 const missing=HE.calculateMinggua({pillars,profile:{gender:'male'}});
 assert.equal(missing.numbering.heaven.number,5);
 assert.equal(missing.status,'NEEDS_PERIOD');assert.equal(missing.early,null);
 const ready=HE.calculateMinggua({pillars,profile:{gender:'male',period:'upper',periodReferenceId:'Test-Book',periodReferenceDetail:'Tập 1, trang 22, ví dụ số năm'}});
 assert.ok(ready.early);assert.equal(ready.early.heavenNumber,8);
 const pure=HE.calculateMinggua({pillars:['Quý Mão','Nhâm Tuất','Giáp Thân','Tân Mùi'],profile:{gender:'female'}});
 assert.equal(pure.status,'PENDING_PURE_HEXAGRAM_RULE');assert.equal(pure.later,null);
 assert.throws(()=>HE.calculateMinggua({...classic,profile:null}));
});
test('V11.145: giữ cách nhập quẻ nguồn riêng; không âm thầm coi input là kết quả suy ra',()=>{
 const source={kingWen:24,yuanTangLine:3,referenceId:'Ed-1308',referenceDetail:'Volume 1, page 38'};
 const r=HE.calculateMinggua({...classic,hexagram:source});
 assert.equal(r.sourceEntered.status,'SOURCE_ENTERED_NOT_DERIVED');
 assert.equal(r.sourceEntered.kingWen,24);
 assert.equal(HEX.hexagramFromBits(r.early.bits).number,44);
});
test('V11.145: route, tài liệu, kiểu khai báo và không thay module cổ',()=>{
 const ui=fs.readFileSync(path.join(R,'apps/web/src/app/ha-lac/page.tsx'),'utf8');
 assert.match(ui,/calculateMinggua/);assert.doesNotMatch(ui,/calculate\(spec\)/);assert.match(ui,/Nguyên Đường|Nguyên Đường/);
 assert.match(ui,/NEEDS_PERIOD|Tam Nguyên/);
 assert.ok(fs.existsSync(path.join(R,'packages/astrology-engine/src/ha-lac-minggua-v11145.d.cts')));
 assert.equal(OLD.METHOD,'he-luo-number-candidate-study-v11.136');
});
