'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Annual=require('../packages/astrology-engine/src/annual.js');
const {renderChartSvg}=require('../packages/chart-export/src/index.cjs');
const mod=(x,m)=>((x%m)+m)%m;
function chart(year,gender='Nam') {
  return Engine.calculate({date:`${year}-08-15`,calendar:'solar',leap:false,gender,hour:9,minute:15});
}
const startByBranch=[10,7,4,1,10,7,4,1,10,7,4,1];

test('V8.7: anchor Tiểu hạn covers all 12 chi sinh, both genders',()=>{
 for(let yr=2000;yr<2012;yr++)for(const gender of ['Nam','Nữ']){
  const c=chart(yr,gender),a=Engine.annualOverview(c,yr);
  assert.equal(a.ageMu,1);
  assert.equal(a.tieuHan.startBranchIndex,startByBranch[mod(yr-4,12)]);
  assert.equal(a.tieuHan.branchIndex,a.tieuHan.startBranchIndex);
  assert.equal(a.tieuHan.palace,c.houses[a.tieuHan.branchIndex].palace);
  assert.match(a.tieuHan.ruleSet,/tu-mo/);
 }
});

test('V8.7 golden example: nam Giáp Tý 1984 tiểu hạn 1984 Tuất, 1985 Hợi, 1986 Tý',()=>{
 const c=chart(1984,'Nam');
 assert.deepEqual([1984,1985,1986,1996].map(y=>Engine.annualOverview(c,y).tieuHan.branch),['Tuất','Hợi','Tý','Tuất']);
});

test('V8.7 golden example: nữ Canh Ngọ 1990 tiểu hạn khởi Thìn and counts backward',()=>{
 const c=chart(1990,'Nữ');
 assert.deepEqual([1990,1991,1992,2002].map(y=>Engine.annualOverview(c,y).tieuHan.branch),['Thìn','Mão','Dần','Thìn']);
});

test('V8.7 invariant: 12-year repeat, 1-year step, and different male/female directions',()=>{
 for(let y=1950;y<=2050;y+=5)for(const gender of ['Nam','Nữ']){
  const c=chart(y,gender);
  for(let at=y;at<=Math.min(y+24,2100);at++){
   const a=Engine.annualOverview(c,at);
   const step=gender==='Nam'?1:-1;
   assert.equal(a.tieuHan.branchIndex,mod(startByBranch[mod(y-4,12)]+step*(at-y),12));
   if(at+12<=2100) assert.equal(a.tieuHan.branch,Engine.annualOverview(c,at+12).tieuHan.branch);
  }
 }
});

test('V8.7 current-year helper changes at Vietnamese Tết rather than 1 Jan',()=>{
 assert.equal(Engine.currentVietnamLunarYear(new Date('2026-02-01T00:00:00Z')),2025);
 assert.equal(Engine.currentVietnamLunarYear(new Date('2026-02-16T16:59:00Z')),2025);
 assert.equal(Engine.currentVietnamLunarYear(new Date('2026-02-16T17:00:00Z')),2026);
 assert.equal(Engine.currentVietnamLunarYear(new Date('2026-10-09T18:01:00Z')),2026);
 assert.equal(Engine.suggestedAnnualYear(chart(2040),new Date('2026-10-09T18:01:00Z')),2040);
 assert.equal(Engine.suggestedAnnualYear(chart(2004),new Date('2026-02-01T00:00:00Z')),2025);
 assert.throws(()=>Engine.currentVietnamLunarYear(new Date('not a date')),TypeError);
});

test('V8.7 Tiểu hạn and natal year are distinct from unimplemented full Lưu niên',()=>{
 const c=chart(2004,'Nam'),a=Engine.annualOverview(c,2026);
 assert.equal(c.coverage.fullLuuNien,false);
 assert.equal(c.coverage.tieuHan,Annual.TIEU_HAN_RULESET);
 assert.equal(a.luuThaiTueBranch,'Ngọ');
 assert.equal(a.tieuHan.branch,'Thân');
 assert.match(a.note,/CHƯA tính đầy đủ lưu niên/i);
 assert.equal(a.luuTuHoa.items.length,4);
});

test('V8.7 chart-export SVG includes Tiểu hạn label and XML escapes input',()=>{
 const c=chart(2004);const a=Engine.annualOverview(c,2026);
 const svg=renderChartSvg(c,'Người <thử>&',a);
 assert.match(svg,/Tiểu hạn đang xét/);
 assert.match(svg,/Tiểu hạn: Thân/);
 assert.match(svg,/Người &lt;thử&gt;&amp;/);
 assert.doesNotMatch(svg,/<thử>/);
 assert.equal((svg.match(/<rect x="\d+(?:\.\d+)?" y="\d+(?:\.\d+)?" width="290"/g)||[]).length,12);
});

test('V8.7 files wired: annual summary, markers and recommendation year',()=>{
 const {readFileSync}=require('node:fs');
 const p='apps/web/src/features/chart/components/';
 const b=readFileSync(p+'chart-board.tsx','utf8')+'\n'+readFileSync(p+'palace-tile.tsx','utf8');
 const r=readFileSync(p+'chart-result.tsx','utf8');
 assert.match(b,/Tiểu hạn/);assert.match(b,/isTieuHan/);
 assert.match(r,/Engine.suggestedAnnualYear/);
 assert.match(b,/Engine.suggestedAnnualYear/);
});
