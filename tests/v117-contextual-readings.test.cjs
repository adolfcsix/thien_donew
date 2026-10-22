'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const root=path.join(__dirname,'..');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const {buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const guide=require('../packages/knowledge/src/star-study-guide.json');
const base={date:'2004-08-15',calendar:'solar',leap:false,gender:'Nam',hour:8,minute:30};
test('V11.7: all twelve topics have independent complete editorial fields',()=>{
  assert.equal(Knowledge.palaceNames.length,12);
  assert.equal(new Set(Knowledge.palaceNames).size,12);
  for(const topic of Object.values(Knowledge.topics)){
    for(const field of ['title','context','reflection','boundary']) assert.ok(topic[field].length>(field==='title'?8:45),`${topic.id} missing ${field}`);
    assert.equal(topic.guidance.length,3);
  }
  assert.equal(Knowledge.lookupPalace('toString'),null);
});
test('V11.7: twelve palace readings use real natal positions, include real relations, and never alter input',()=>{
  const chart=Engine.calculate(base),before=JSON.stringify(chart);
  for(const house of chart.houses){
    const reading=buildPalaceReading({chart,branchIndex:house.branchIndex,guide});
    assert.equal(reading.palace,house.palace);
    assert.deepEqual(reading.stars.map(s=>s.name),house.stars);
    assert.deepEqual(reading.supporting,[...house.auxiliaryStars,...house.yearStars,...(house.additionalStars??[]),...(house.traditionalStars??[]),...(house.natalExtensionStars??[]),...(house.beneficStars??[]),...(house.positionalStars??[]),...(house.derivedStars??[]),...(house.missingStars??[]),...(house.advancedStars??[])]);
    assert.equal(reading.linked.length,3);
    assert.deepEqual(reading.linked.map(p=>p.branch),[(house.branchIndex+4)%12,(house.branchIndex+8)%12,(house.branchIndex+6)%12].map(i=>chart.houses.find(h=>h.branchIndex===i).branch));
    assert.equal(reading.period,null);
    assert.ok(!JSON.stringify(reading).includes('houses['));
    assert.equal(reading.coverage.completeAnnualAnalysis,false);
  }
  assert.equal(JSON.stringify(chart),before);
});
test('V11.7: annual facts appear only when enabled, and use matching branch',()=>{
  const chart=Engine.calculate(base),annual=Engine.annualOverview(chart,2028);
  const b=annual.tieuHan.branchIndex;
  const hidden=buildPalaceReading({chart,branchIndex:b,annual,includeAnnual:false,guide});
  assert.equal(hidden.period,null);
  const visible=buildPalaceReading({chart,branchIndex:b,annual,includeAnnual:true,guide});
  assert.ok(visible.period.markers.includes('Tiểu hạn của năm đang xem'));
  assert.deepEqual(visible.period.annualStars,annual.luuStars.items.filter(s=>s.branch===b).map(s=>s.name));
});
test('V11.7: unknown editorial star and void main-stars are never fabricated',()=>{
  const chart=Engine.calculate(base);
  const b=chart.houses[0].branchIndex;
  const unknown=structuredClone(chart);
  unknown.houses[0].stars=['Ngôi sao tưởng tượng'];
  const fake=buildPalaceReading({chart:unknown,branchIndex:b,guide});
  assert.equal(fake.stars[0].motif,null);
  assert.deepEqual(fake.coverage.unknownMainStars,['Ngôi sao tưởng tượng']);
  unknown.houses[0].stars=[];
  const empty=buildPalaceReading({chart:unknown,branchIndex:b,guide});
  assert.equal(empty.isVoChinhDieu,true);
  assert.equal(empty.stars.length,0);
});
test('V11.7: broken chart shapes are rejected before interpretation',()=>{
  const chart=Engine.calculate(base);
  assert.throws(()=>buildPalaceReading({chart,branchIndex:-1,guide}),RangeError);
  assert.throws(()=>buildPalaceReading({chart:{...chart,houses:chart.houses.slice(1)},branchIndex:0,guide}),RangeError);
  const duplicate=structuredClone(chart); duplicate.houses[1].branchIndex=duplicate.houses[0].branchIndex;
  assert.throws(()=>buildPalaceReading({chart:duplicate,branchIndex:0,guide}),RangeError);
});
test('V11.7: reading component has basic/deep modes and only source-agnostic display fields',()=>{
  const component=fs.readFileSync(path.join(root,'apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
  const board=fs.readFileSync(path.join(root,'apps/web/src/features/chart/components/chart-board.tsx'),'utf8');
  assert.match(component,/aria-pressed=\{level==='basic'\}/);
  assert.match(component,/aria-pressed=\{level==='deep'\}/);
  assert.match(board,/<PalaceReading chart=\{result\}/);
  assert.doesNotMatch(component,/ruleSet|sourcePath|https?:\/\/|<code>/);
});

test('V11.7: public chart surfaces hide engine rules and provenance paths',()=>{
  const read=file=>fs.readFileSync(path.join(root,file),'utf8');
  const summary=read('apps/web/src/features/chart/components/board-summary.tsx');
  const ledger=read('apps/web/src/features/chart/components/twelve-palace-ledger.tsx');
  const atlas=read('apps/web/src/app/star-atlas/page.tsx');
  const detail=read('apps/web/src/features/chart/components/palace-details.tsx');
  assert.doesNotMatch(summary, /<strong>\{result\.ruleSet\}<\/strong>/);
  assert.doesNotMatch(ledger, /<code[^>]*>\{entry\.sourcePath\}<\/code>/);
  assert.doesNotMatch(atlas, /className="star-atlas-sources"/);
  assert.doesNotMatch(detail, /Quy tắc: \{ruleSet\}/);
});

test('V11.7: downloaded CSV / reading notes omit technical paths by default in UI',()=>{
  const read=file=>fs.readFileSync(path.join(root,file),'utf8');
  const comp=read('apps/web/src/features/chart/components/twelve-palace-ledger.tsx');
  const notes=read('apps/web/src/features/chart/components/palace-study-workbench.tsx');
  assert.match(comp,/exportLedgerCsv\(visible,layers,annual.year,\{includeTechnical:false\}\)/);
  assert.match(notes,/exportStudyMarkdown\(worksheet,mode,note,showAnnual,year,\{includeTechnical:false\}\)/);
  const chart=Engine.calculate(base),annual=Engine.annualOverview(chart,2028);
  const Typescript=require('./helpers-typeloader.cjs');
  const vm=require('node:vm');
  const source=read('apps/web/src/features/chart/lib/twelve-palace-ledger.ts');
  const js=Typescript.transpileModule(source,{compilerOptions:{module:Typescript.ModuleKind.CommonJS,target:Typescript.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};vm.runInNewContext(js,{module:mod,exports:mod.exports});
  const rows=mod.exports.buildTwelvePalaceLedger(chart,annual);
  const publicCsv=mod.exports.exportLedgerCsv(rows,['main'],2028,{includeTechnical:false});
  assert.doesNotMatch(publicCsv,/houses\[/);
  assert.doesNotMatch(publicCsv,/Nguồn chính xác/);
});
