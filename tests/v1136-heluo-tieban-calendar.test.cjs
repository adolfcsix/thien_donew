'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const R=path.resolve(__dirname,'..');
const HE=require('../packages/astrology-engine/src/ha-lac-source.cjs');
const TB=require('../packages/astrology-engine/src/tieban-source.cjs');
const CA=require('../packages/astrology-engine/src/traditional-calendar-audit.cjs');
const links=require('../apps/web/src/features/study-room/study-links.cjs');
const backup=require('../apps/web/src/features/study-room/study-backup.cjs');
const raw={pillars:['Nhâm Ngọ','Tân Hợi','Đinh Hợi','Kỷ Dậu']};
test('V11.136: ví dụ ghi chép Hà Lạc Thiên 34/Địa 28 được tái lập từ 4 trụ, dùng CẢ HAI số chi',()=>{
 const r=HE.calculate(raw);assert.equal(r.heaven.sum,34);assert.equal(r.earth.sum,28);
 assert.deepEqual([...r.heaven.contributions].sort((a,b)=>a-b),[1,1,7,7,9,9]);
 assert.equal(r.trace.length,4);assert.deepEqual(r.trace[1].branchNumbers,[1,6]);
});
test('V11.136: Lạc Thư tổng hàng/cột/chéo 15, bảng Hà Đồ ngũ hành 1–10',()=>{
 assert.deepEqual(HE.LO_CHECK.rows,[15,15,15]);assert.deepEqual(HE.LO_CHECK.columns,[15,15,15]);assert.deepEqual(HE.LO_CHECK.diagonals,[15,15]);assert.deepEqual(HE.HE_TU.flatMap(x=>x.pair).sort((a,b)=>a-b),Array.from({length:10},(_,i)=>i+1));
});
test('V11.136: không chấp nhận cặp Can Chi sai âm dương, không tự nhận quẻ khi thiếu nguồn',()=>{
 assert.throws(()=>HE.calculate({pillars:['Giáp Sửu','Ất Sửu','Bính Dần','Đinh Mão']}));
 assert.equal(HE.calculate(raw).hexagram,null);
 assert.throws(()=>HE.calculate({...raw,branchChoices:[7,6,6,9]}));
 assert.throws(()=>HE.calculate({...raw,hexagram:{kingWen:65,yuanTangLine:6,referenceId:'A123',referenceDetail:'Trang 45'}}));
 assert.throws(()=>HE.calculate({...raw,hexagram:{kingWen:24,yuanTangLine:6,referenceId:'A123',referenceDetail:'-'}}));
});
test('V11.136: quẻ số 1–64 chỉ là chứng bản NHẬP TAY, không được coi là tự suy',()=>{
 const x=HE.calculate({...raw,hexagram:{kingWen:24,yuanTangLine:3,referenceId:'Volume-1',referenceDetail:'Trang 24, hàng 8'}});
 assert.equal(x.hexagram.status,'SOURCE_ENTERED_NOT_DERIVED');assert.equal(x.hexagram.kingWen,24);
});
test('V11.136: 60 Can Chi đúng quy luật parity và tuần hoàn',()=>{
 assert.equal(CA.CYCLE.length,60);assert.equal(new Set(CA.CYCLE.map(x=>x.name)).size,60);
 assert.equal(CA.CYCLE[0].name,'Giáp Tý');assert.equal(CA.CYCLE[59].name,'Quý Hợi');
 for(const p of CA.CYCLE)assert.equal(CA.STEMS.indexOf(p.stem)%2,CA.BRANCHES.indexOf(p.branch)%2);
});
test('V11.136: ngày 23:00 cho kết quả khác giữa đổi ngày dân dụng và Tý sơ',()=>{
 const a=CA.assess({date:'2026-10-14',hour:23,minute:15,dayBoundary:'civil-midnight'});
 const b=CA.assess({date:'2026-10-14',hour:23,minute:15,dayBoundary:'late-zi'});
 assert.equal(a.day.effectiveDate,'2026-10-14');assert.equal(b.day.effectiveDate,'2026-10-15');
 assert.notEqual(a.day.pillar,b.day.pillar);assert.equal(b.day.jdn-a.day.jdn,1);
});
test('V11.136: đổi giờ 22h59 và 23h00, bao gồm 31/12 không lỗi',()=>{
 assert.equal(CA.assess({date:'2026-12-31',hour:22,minute:59,dayBoundary:'late-zi'}).day.effectiveDate,'2026-12-31');
 assert.equal(CA.assess({date:'2026-12-31',hour:23,minute:0,dayBoundary:'late-zi'}).day.effectiveDate,'2027-01-01');
});
test('V11.136: Nguyệt theo tiết khí chỉ là ước lượng, Lập Xuân thiếu mốc không có năm',()=>{
 const a=CA.assess({date:'2026-02-04',hour:3,yearBoundary:'lichun-confirmed'});
 assert.equal(a.year.status,'UNRESOLVED');assert.equal(a.year.name,null);assert.equal(a.month.approximate,true);
});
test('V11.136: giờ Lập Xuân ngoại kiểm quy UTC; trước/sau mốc cho hai năm',()=>{
 const options={date:'2026-02-04',yearBoundary:'lichun-confirmed',confirmedLichunUtc:'2026-02-03T20:02:00Z',calendarSource:'HKO 2026 Almanac UTC+08:00'};
 const before=CA.assess({...options,hour:3,minute:1});const after=CA.assess({...options,hour:3,minute:3});
 assert.equal(before.year.name,'Ất Tỵ');assert.equal(after.year.name,'Bính Ngọ');
 assert.equal(before.year.status,'SOURCE_DECLARED_NOT_INDEPENDENTLY_VERIFIED');assert.equal(after.year.status,'SOURCE_DECLARED_NOT_INDEPENDENTLY_VERIFIED');
 assert.throws(()=>CA.assess({...options,confirmedLichunUtc:'2027-02-03T20:02:00Z'}));
});
test('V11.136: lịch Gregorian & giờ ngoài phạm vi bị từ chối, không vỡ ở nhuận 2000',()=>{
 assert.throws(()=>CA.assess({date:'2026-02-29'}));assert.throws(()=>CA.assess({date:'1888-01-01'}));
 assert.doesNotThrow(()=>CA.assess({date:'2000-02-29',hour:12}));
 assert.throws(()=>CA.assess({date:'2026-10-14',hour:24}));
 assert.throws(()=>CA.assess({date:'2026-10-14',minute:60}));
});
test('V11.136: Thiết Bản 8/12 phần giờ là hai phương pháp độc lập',()=>{
 const a=TB.sliceTime({hour:23,minute:15,methodId:'eight-parts',sourceId:'study-ref'});
 const b=TB.sliceTime({hour:23,minute:15,methodId:'twelve-parts',sourceId:'study-ref'});
 assert.equal(a.branch,'Tý');assert.equal(a.part,2);assert.equal(b.part,2);
 assert.equal(a.startLocal,'23:15');assert.equal(b.startLocal,'23:10');
 assert.equal(a.noTextLookup,true);assert.equal(b.noTextLookup,true);
});
test('V11.136: 24h và 96/144 phần, phân đoạn liên tục 2h, không nhầm Tý qua ngày',()=>{
 for(const [id,count] of [['eight-parts',96],['twelve-parts',144]]){
  const entries=[];const method=TB.TIME_METHODS[id];const interval=120/method.divisions;
  for(let t=0;t<1440;t+=interval){const r=TB.sliceTime({hour:Math.floor(t/60),minute:t%60,methodId:id,sourceId:'study-ref'});entries.push(`${r.branch}-${r.part}`);}
  assert.equal(new Set(entries).size,count);
 }
 const a=TB.sliceTime({hour:0,minute:0,sourceId:'study-ref'});
 assert.equal(a.branch,'Tý');assert.equal(a.part,5);
});
test('V11.136: điều văn không thể không có trang/số/giấy phép/tài liệu; cùng số khác văn bản được báo khảo dị',()=>{
 const r={corpusId:'book-1',edition:'Edition A',sourceUrl:'https://example.org/book',page:'Page 6',articleNumber:'1001',transcription:'Một câu trích lục ví dụ.',license:'CC-0',verification:'unchecked'};
 assert.throws(()=>TB.compareEntries([{...r,sourceUrl:'file:///x'}]));
 assert.throws(()=>TB.compareEntries([{...r,license:''}]));
 const c=TB.compareEntries([r,{...r,edition:'Edition B',transcription:'Văn bản dị bản khác.'}]);
 assert.equal(c.variants.length,1);assert.equal(c.variants[0].requiresCollation,true);
});
test('V11.136: Thư phòng kiểm input, tạo link khôi phục đúng ba miền; chặn JSON sai',()=>{
 const h=HE.calculate(raw);const t={hour:23,minute:15,sourceId:'study-ref',methodId:'eight-parts'};
 const c={date:'2026-10-14',hour:23,minute:15,dayBoundary:'late-zi',yearBoundary:'lunar-year'};
 for(const [id,s] of [['ha-lac',raw],['thiet-ban',t],['lich-phap',c]]){
  assert.equal(links.validSnapshot(id,s),true);const href=links.studyHref(id,s);assert.notEqual(href,'/study');const recovered=links.readStudyInput(id,href.split('?')[1]);assert.deepEqual(recovered,s);
  assert.equal(backup.parseStudyBackup({format:backup.FORMAT,version:backup.VERSION,entries:[{discipline:id,title:'A',summary:'',notes:'',tags:[],pinned:false,snapshot:s}]}).length,1);
 }
 assert.equal(links.validSnapshot('ha-lac',{...raw,branchChoices:[1,2,3,4]}),false);
 assert.equal(links.validSnapshot('thiet-ban',{...t,sourceId:'x'}),false);
 assert.equal(h.hexagram,null);
});
test('V11.136: route/ui và registry có thực, không tạo số điều hoặc quẻ nguồn giả',()=>{
 const files=['apps/web/src/app/ha-lac/page.tsx','apps/web/src/app/thiet-ban/page.tsx','apps/web/src/features/traditional-calendar/calendar-audit-panel.tsx','apps/web/src/app/calendar/page.tsx'];
 for(const f of files)assert.ok(fs.existsSync(path.join(R,f)));
 const cfg=JSON.parse(fs.readFileSync(path.join(R,'packages/knowledge/src/research-disciplines.json'),'utf8'));
 assert.ok(cfg.records.some(x=>x.id==='ha-lac'&&x.route==='/ha-lac'));
 assert.ok(cfg.records.some(x=>x.id==='thiet-ban'&&x.route==='/thiet-ban'));
 assert.match(fs.readFileSync(path.join(R,'apps/web/src/app/calendar/page.tsx'),'utf8'),/CalendarAuditPanel/);
});
const HC=require('../packages/astrology-engine/src/calendar-history-research.cjs');
test('V11.136: đổi lịch dương Julius/Gregory cùng JDN, giữ mốc 1582, 1700, 2000',()=>{
 assert.equal(HC.toJdn(2000,1,1,'gregorian'),2451545);
 assert.equal(HC.toJdn(1582,10,4,'julian'),2299160);
 assert.deepEqual(HC.compare({year:1582,month:10,day:4,style:'julian'}).sameDayInOtherStyle,{year:1582,month:10,day:14,style:'gregorian'});
 assert.deepEqual(HC.compare({year:1700,month:2,day:29,style:'julian'}).sameDayInOtherStyle,{year:1700,month:3,day:11,style:'gregorian'});
 assert.throws(()=>HC.toJdn(1700,2,29,'gregorian'));
});
test('V11.136: chuyển JDN lịch Julius/Gregory 1600–2100 hồi quy hai chiều',()=>{
 for(let year=1600;year<=2100;year+=5)for(const kind of ['julian','gregorian'])for(const m of [1,2,3,6,10,12]){
  const n=HC.toJdn(year,m,1,kind);const v=HC.fromJdn(n,kind);assert.deepEqual([v.year,v.month,v.day],[year,m,1]);
 }
});
