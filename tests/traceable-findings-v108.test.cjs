'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Research=require('../packages/astrology-engine/src/palace-research.js');
const Findings=require('../packages/astrology-engine/src/traceable-findings.js');
const read=(...path)=>readFileSync(join(__dirname,'..',...path),'utf8');
const sample=()=>Engine.calculate({date:'2004-08-15',hour:8,minute:30,gender:'Nam'});
const get=(chart,year,branch)=>Findings.build(Research.build(chart,year===null?null:Engine.annualOverview(chart,year),branch));

test('traceable findings: source contract & no mutation across all 12 palace anchors',()=>{
  const chart=sample(),annual=Engine.annualOverview(chart,2026),before=JSON.stringify([chart,annual]);
  for(let branch=0;branch<12;branch++){
    const research=Research.build(chart,annual,branch),result=Findings.build(research);
    assert.equal(result.ruleSet,Findings.RULESET);
    assert.equal(result.sourceRuleSet,Research.RULESET);
    assert.equal(result.anchorBranchIndex,branch);
    assert.equal(result.annualYear,2026);
    assert.equal(result.summary.all,result.findings.length);
    assert.equal(result.summary.natal+result.summary.annual,result.summary.all);
    assert.match(result.disclaimer,/Không phải điểm số/);
    for(const finding of result.findings){
      assert.match(finding.id,/^TD-0[1-9]$/);
      assert.ok(finding.evidence.length>0,finding.id);
      for(const evidence of finding.evidence){
        const p=research.perspectives.find(x=>x.branchIndex===evidence.branchIndex);
        assert.ok(p,finding.id);
        const layer=p.layers.find(x=>x.id===evidence.layer);
        assert.ok(layer);
        assert.equal(evidence.path,layer.path);
        if(evidence.star===null){assert.equal(evidence.layer,'main');assert.equal(layer.records.length,0);}
        else assert.ok(layer.records.some(x=>x.name===evidence.star&&x.transformation===evidence.transformation),`untraceable: ${finding.id} ${evidence.star}`);
      }
    }
  }
  assert.equal(JSON.stringify([chart,annual]),before);
  assert.equal(Engine.traceableFindingsRuleSet,Findings.RULESET);
});

test('traceable findings: every year-specific observation disappears when annual layer is disabled',()=>{
  const chart=sample();
  const r=Research.build(chart,Engine.annualOverview(chart,2026),5);
  const a=Findings.build(r,{includeAnnual:true});
  const b=Findings.build(r,{includeAnnual:false});
  assert.ok(a.findings.some(x=>x.annual));
  assert.equal(b.annualYear,null);
  assert.equal(b.summary.annual,0);
  assert.ok(b.findings.every(x=>!x.annual&&x.id!=='TD-07'&&x.id!=='TD-08'));
  assert.deepEqual(b.findings,a.findings.filter(x=>!x.annual));
});

test('traceable findings: independent year selection changes only year-based source cards',()=>{
  const chart=sample();
  const a=get(chart,2026,0),b=get(chart,2034,0);
  assert.equal(a.annualYear,2026);assert.equal(b.annualYear,2034);
  assert.deepEqual(a.findings.filter(x=>!x.annual),b.findings.filter(x=>!x.annual));
  for(const result of [a,b]){
    for(const f of result.findings.filter(x=>x.annual)){
      assert.ok(f.evidence.some(x=>x.layer==='annual-transformation'));
      assert.match(f.description,new RegExp(String(result.annualYear)));
    }
  }
});

test('traceable findings: vacant main layer produces explicit, verifiable and non-judgmental TD-03',()=>{
  const chart=sample();
  let count=0;
  for(let branch=0;branch<12;branch++){
    const h=chart.houses.find(x=>x.branchIndex===branch),r=get(chart,null,branch);
    const card=r.findings.find(x=>x.id==='TD-03');
    if(!h.stars.length){count++;assert.equal(card.evidence[0].path,'houses[].stars');assert.equal(card.evidence[0].star,null);assert.match(card.description,/Không đồng nghĩa cung này xấu/);}
    else assert.equal(card,undefined);
    assert.equal(Boolean(r.findings.find(x=>x.id==='TD-02')),h.stars.length>=2);
  }
  assert.ok(count>0);
});

test('traceable findings: TD-04 & TD-05 star references remain in their exact relation branches',()=>{
  const chart=sample();
  for(let branch=0;branch<12;branch++){
    const res=get(chart,null,branch);
    for(const f of res.findings.filter(x=>['TD-04','TD-05'].includes(x.id))){
      for(const evidence of f.evidence){
        assert.equal(evidence.layer,'main');
        assert.equal(evidence.role,f.id==='TD-04'?'tam-hop':'opposite');
        assert.equal((evidence.branchIndex-branch+12)%12===6,f.id==='TD-05');
        assert.ok(chart.houses.find(h=>h.branchIndex===evidence.branchIndex).stars.includes(evidence.star));
      }
    }
  }
});

test('traceable findings: no invalid, duplicated or tampered source graph accepted',()=>{
  const chart=sample();const r=Research.build(chart,null,1);
  for(const invalid of [null,{},[],{perspectives:[]}])assert.throws(()=>Findings.build(invalid),RangeError);
  const wrong=structuredClone(r);wrong.perspectives[1].branchIndex=wrong.perspectives[0].branchIndex;
  assert.throws(()=>Findings.build(wrong),RangeError);
  const wrongRelation=structuredClone(r);wrongRelation.perspectives[3].branchIndex=0;
  assert.throws(()=>Findings.build(wrongRelation),RangeError);
  const wrongRecord=structuredClone(r);let layer=wrongRecord.perspectives[0].layers.find(l=>l.records.length>0);
  layer.records[0].path='untrusted.external';
  assert.throws(()=>Findings.build(wrongRecord),RangeError);
  const falsifiedPath=structuredClone(r);const changed=falsifiedPath.perspectives[0].layers[0];changed.path='injected.path';for(const record of changed.records)record.path='injected.path';
  assert.throws(()=>Findings.build(falsifiedPath),RangeError);
  const duplicateLayer=structuredClone(r);duplicateLayer.perspectives[0].layers[1]=duplicateLayer.perspectives[0].layers[0];
  assert.throws(()=>Findings.build(duplicateLayer),RangeError);
});

test('traceable findings: charts saved without optional stars remain readable',()=>{
  const legacy=structuredClone(sample());
  for(const house of legacy.houses){delete house.additionalStars;delete house.tuHoa;}
  const r=Research.build(legacy,null,3),result=Findings.build(r);
  assert.ok(result.findings.length>0);
  assert.ok(result.findings.every(x=>!x.annual));
});

test('traceable findings: React integration remains in real chart room, source and CSS responsive',()=>{
  const board=read('apps','web','src','features','chart','components','chart-board.tsx');
  const panel=read('apps','web','src','features','chart','components','traceable-findings-panel.tsx');
  const css=read('apps','web','src','app','traceable-findings.css');
  const layout=read('apps','web','src','app','layout.tsx');
  assert.match(board,/Engine\.traceableFindings\(research,\{includeAnnual:showAnnual\}\)/);
  assert.match(board,/<TraceableFindingsPanel result=\{findings\}/);
  assert.match(panel,/finding\.evidence\.map/);
  assert.match(panel,/source\.path/);
  assert.match(panel,/aria-pressed=\{filter===key\}/);
  assert.match(css,/@media\(max-width:500px\)/);
  assert.ok(layout.includes(['import', "'./traceable-findings.css';"].join(' ')));
});

test('traceable findings: browser UMD fallback does not break old HTML loaders',()=>{
  const vm=require('node:vm');
  const root={};
  for(const name of ['Lunar','Almanac','BaZi','GoodDays','Auxiliary','TuHoa','Cycles','YearStars','StarStrength','AdditionalStars','Annual'])root[`ThienDo${name}`]={RULESET:'old'};
  vm.runInNewContext(read('packages','astrology-engine','src','tuvi.js'),root);
  assert.equal(typeof root.ThienDoTuVi.calculate,'function');
  assert.throws(()=>root.ThienDoTuVi.traceableFindings({}),/Cần tải traceable-findings.js/);
  const loaded={...root};
  vm.runInNewContext(read('packages','astrology-engine','src','traceable-findings.js'),loaded);
  vm.runInNewContext(read('packages','astrology-engine','src','tuvi.js'),loaded);
  const research=Research.build(sample(),null,3);
  assert.equal(loaded.ThienDoTuVi.traceableFindings(research).ruleSet,Findings.RULESET);
});
