'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Inventory=require('../packages/chart-export/src/star-inventory.cjs');
const Audit=require('../packages/star-audit/src/index.cjs');
test('1440 birth cases retain104 unique natal/cycle names,14 primary and90 supporting; top-level groups match houses',()=>{
 const expected=Audit.buildInventory().records.map(r=>r.name).sort();let cases=0;
 for(let year=1960;year<2020;year++)for(let branch=0;branch<12;branch++)for(const gender of ['Nam','Nữ']){
  const month=year%12+1,date=`${year}-${String(month).padStart(2,'0')}-${String(branch+1).padStart(2,'0')}`;
  const chart=Engine.calculate({date,hour:branch*2,minute:30,gender,calendar:'solar'});
  assert.deepEqual(chart.houses.flatMap(Inventory.natalNames).sort(),expected,`${date} ${branch} ${gender}`);
  assert.equal(chart.houses.flatMap(h=>h.stars).length,14);assert.equal(chart.houses.flatMap(Inventory.supportingNames).length,90);
  const top=Audit.GROUPS.flatMap(g=>g.get(chart));assert.deepEqual(top.sort(),chart.houses.flatMap(Inventory.natalNames).sort());cases++;
 }assert.equal(cases,1440);
});
test('complete printed appendix includes all104 names and every separate annual/marker/transformation layer',()=>{
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'}),annual=Engine.annualOverview(chart,2026),html=Inventory.renderStarAppendixHtml(chart,annual);
 for(const name of chart.houses.flatMap(Inventory.natalNames))assert.ok(html.includes(name),name);
 for(const h of chart.houses){for(const marker of h.obstructionMarkers||[])assert.ok(html.includes(marker));for(const t of h.tuHoa)assert.ok(html.includes(t.name+' · '+t.star));}
 for(const s of annual.luuStars.items)assert.ok(html.includes(s.name));for(const t of annual.luuTuHoa.items)assert.ok(html.includes(t.name+' · '+t.star));
 assert.equal((html.match(/<article>/g)||[]).length,12);assert.ok(!html.includes('xem JSON'));
});
test('appendix safely escapes every text field; cycles counted once and marker not a star',()=>{const h={stars:['Tử Vi'],auxiliaryStars:['Thiên Khôi'],cycleStars:{thaiTue:['Thái Tuế'],bacSi:['Bác Sĩ'],trangSinh:['Tràng Sinh']},obstructionMarkers:['Tuần']};assert.equal(Inventory.natalNames(h).length,5);assert.equal(Inventory.supportingNames(h).length,4);assert.ok(!Inventory.natalNames(h).includes('Tuần'));const chart={houses:Array.from({length:12},()=>({...h,palace:'<script>alert(1)</script>',stem:'&',branch:'"'}))};const html=Inventory.renderStarAppendixHtml(chart);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));});
