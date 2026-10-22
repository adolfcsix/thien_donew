'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const Engine = require('../packages/astrology-engine/src/tuvi.js');
const Research = require('../packages/astrology-engine/src/palace-research.js');
const sample = (date='2004-08-15', hour=8, gender='Nam') => Engine.calculate({date,hour,minute:30,gender});
const roots = (...files) => readFileSync(join(__dirname, '..', ...files),'utf8');

test('palace research: all 12 anchors produce exactly [self, +4, +8, +6] with distinct roles', () => {
  const chart=sample();
  for(let branch=0;branch<12;branch++){
    const r=Engine.palaceResearch(chart,null,branch);
    assert.equal(r.ruleSet,Research.RULESET);
    assert.deepEqual(r.perspectives.map(p=>p.branchIndex),[branch,(branch+4)%12,(branch+8)%12,(branch+6)%12]);
    assert.deepEqual(r.perspectives.map(p=>p.role),['selected','tam-hop','tam-hop','opposite']);
    assert.equal(new Set(r.perspectives.map(p=>p.branchIndex)).size,4);
    assert.equal(r.perspectives[0].palace,chart.houses[branch].palace);
    assert.equal(r.annualYear,null);
  }
});

test('palace research: each natal layer is a faithful positional projection, without inference', () => {
  const chart=sample();
  for(const h of chart.houses){
    const r=Engine.palaceResearch(chart,null,h.branchIndex);
    const p=r.perspectives[0];
    for(const [id,source] of [['main','stars'],['auxiliary','auxiliaryStars'],['year','yearStars'],['additional','additionalStars'],['traditional','traditionalStars'],['natal-extensions','natalExtensionStars']]){
      const layer=p.layers.find(l=>l.id===id);
      assert.deepEqual(layer.records.map(x=>x.name),h[source]??[],`${h.palace} ${id}`);
      assert.ok(layer.records.every(x=>x.branchIndex===h.branchIndex && x.path===layer.path));
    }
    const nat=p.layers.find(l=>l.id==='birth-transformation');
    assert.deepEqual(nat.records.map(x=>[x.transformation,x.name]),h.tuHoa.map(x=>[x.name,x.star]));
    assert.equal(p.natalStarCount,new Set([...h.stars,...h.auxiliaryStars,...h.yearStars,...(h.additionalStars??[]),...(h.traditionalStars??[]),...(h.natalExtensionStars??[]),...(h.beneficStars??[]),...(h.positionalStars??[]),...(h.derivedStars??[]),...(h.missingStars??[])]).size);
  }
});

test('palace research: natal Tứ Hóa is not mixed with annual overlays, which follow the selected year', () => {
  const chart=sample('1995-05-20',16,'Nữ');
  for(const year of [2001,2026,2075]){
    const annual=Engine.annualOverview(chart,year);
    const result=Engine.palaceResearch(chart,annual,7);
    assert.equal(result.annualYear,year);
    assert.equal(result.annualRuleSet,annual.ruleSet);
    for(const p of result.perspectives){
      const h=chart.houses.find(x=>x.branchIndex===p.branchIndex);
      const natal=p.layers.find(x=>x.id==='birth-transformation');
      const yearly=p.layers.find(x=>x.id==='annual-transformation');
      const star=p.layers.find(x=>x.id==='annual-star');
      assert.deepEqual(natal.records.map(x=>[x.transformation,x.name]),h.tuHoa.map(x=>[x.name,x.star]));
      assert.deepEqual(yearly.records.map(x=>[x.transformation,x.name]),annual.luuTuHoa.items.filter(x=>x.branch===p.branchIndex).map(x=>[x.name,x.star]));
      assert.deepEqual(star.records.map(x=>x.name),annual.luuStars.items.filter(x=>x.branch===p.branchIndex).map(x=>x.name));
    }
  }
});

test('palace research: old charts with missing optional additionalStars, Tứ Hóa and cycles are accepted', () => {
  const chart=sample();
  const legacy=structuredClone(chart);
  for(const h of legacy.houses){delete h.additionalStars;delete h.additionalStarDetails;delete h.tuHoa;delete h.cycleStars;}
  delete legacy.additionalStars;
  const result=Research.build(legacy,null,10);
  assert.equal(result.perspectives.length,4);
  for(const p of result.perspectives){
    assert.deepEqual(p.layers.find(l=>l.id==='additional').records,[]);
    assert.deepEqual(p.layers.find(l=>l.id==='birth-transformation').records,[]);
  }
});

test('palace research: rejects corrupt, incomplete or duplicate house topology', () => {
  const chart=sample();
  for(const index of [-1,12,1.5,NaN,Infinity,'6',null]) assert.throws(()=>Research.build(chart,null,index),RangeError);
  assert.throws(()=>Research.build({houses:[]},null,0),RangeError);
  assert.throws(()=>Research.build({houses:chart.houses.slice(0,11)},null,0),RangeError);
  const duplicate=structuredClone(chart);duplicate.houses[5].branchIndex=duplicate.houses[4].branchIndex;
  assert.throws(()=>Research.build(duplicate,null,0),RangeError);
  const malformed=structuredClone(chart);malformed.houses[0].branchIndex=12;
  assert.throws(()=>Research.build(malformed,null,0),RangeError);
});

test('palace research: does not mutate or alter calculation output, including saved charts', () => {
  const chart=sample('2023-03-22',22);
  const annual=Engine.annualOverview(chart,2026);
  const before=JSON.stringify([chart,annual]);
  for(let branch=0;branch<12;branch++) Research.build(chart,annual,branch);
  assert.equal(JSON.stringify([chart,annual]),before);
  assert.equal(Engine.calculate({date:'2023-03-22',hour:22,minute:30,gender:'Nam'}).ruleSet,chart.ruleSet);
  assert.equal(Engine.palaceResearchRuleSet,Research.RULESET);
});

test('palace research: source provenance is present and Tứ Hóa targets have evidence flags', () => {
  const chart=sample();const annual=Engine.annualOverview(chart,2026);
  for(let branch=0;branch<12;branch++){
    const r=Research.build(chart,annual,branch);
    for(const p of r.perspectives){
      assert.deepEqual(p.layers.map(x=>x.id),Research.layers.map(x=>x.id));
      for(const l of p.layers){
        assert.ok(l.path.includes('.'),l.id);
        assert.ok(l.records.every(x=>x.kind===l.id && x.path===l.path && x.branchIndex===p.branchIndex));
      }
      const natal=new Set(p.layers.filter(x=>['main','auxiliary','year','additional','traditional'].includes(x.id)).flatMap(x=>x.records.map(x=>x.name)));
      for(const x of p.transformationTargets)assert.equal(x.targetPresentInNatal,natal.has(x.name));
    }
  }
  assert.match(Research.build(chart,annual,0).disclaimer,/không suy ra cát hung/);
});

test('palace research UI: sourced component, responsive style and conditional annual display integrated', () => {
  const board=roots('apps','web','src','features','chart','components','chart-board.tsx');
  const panel=roots('apps','web','src','features','chart','components','palace-research-panel.tsx');
  const css=roots('apps','web','src','app','palace-research.css');
  const layout=roots('apps','web','src','app','layout.tsx');
  assert.match(board,/Engine\.palaceResearch\(result, annual, selectedHouse\.branchIndex\)/);
  assert.match(board,/<PalaceResearchPanel research=\{research\} showAnnual=\{showAnnual\} onSelect=\{selectHouse\}/);
  assert.doesNotMatch(panel,/<code>\{layer\.path\}<\/code>/);
  assert.match(panel,/showAnnual &&/);
  assert.match(panel,/perspective\.branchIndex/);
  assert.match(css,/@media\(max-width:500px\)/);
  assert.ok(layout.includes("import '" + [".","/palace-research.css"].join("") + "';"));
});

test('palace research: standalone legacy UMD loader still evaluates without the optional research script', () => {
  const vm = require('node:vm');
  const source=roots('packages','astrology-engine','src','tuvi.js');
  const root={};
  for(const name of ['Lunar','Almanac','BaZi','GoodDays','Auxiliary','TuHoa','Cycles','YearStars','StarStrength','AdditionalStars','Annual']){
    root[`ThienDo${name}`]={RULESET:'legacy-umd-test'};
  }
  vm.runInNewContext(source,root,{filename:'tuvi.js'});
  assert.equal(typeof root.ThienDoTuVi.calculate,'function');
  assert.equal(root.ThienDoTuVi.palaceResearchRuleSet,Research.RULESET);
  assert.throws(()=>root.ThienDoTuVi.palaceResearch({},null,0),/Cần tải palace-research.js/);
});

test('palace research: UMD loader uses research module when loaded before tuvi.js', () => {
  const vm = require('node:vm');
  const root={};
  for(const name of ['Lunar','Almanac','BaZi','GoodDays','Auxiliary','TuHoa','Cycles','YearStars','StarStrength','AdditionalStars','Annual'])root[`ThienDo${name}`]={RULESET:'legacy-umd-test'};
  vm.runInNewContext(roots('packages','astrology-engine','src','palace-research.js'),root);
  vm.runInNewContext(roots('packages','astrology-engine','src','tuvi.js'),root);
  const result=root.ThienDoTuVi.palaceResearch(sample(),null,3);
  assert.deepEqual(Array.from(result.perspectives,x=>x.branchIndex),[3,7,11,9]);
});
