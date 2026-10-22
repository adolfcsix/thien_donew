'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const vm=require('node:vm');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const guide=require('../packages/knowledge/src/star-study-guide.json');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ts = require('./helpers-typeloader.cjs');
function load(file){
  const transpiled=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(transpiled,{module,exports:module.exports,require:name=>{throw new Error('Unexpected runtime import: '+name);}});
  return module.exports;
}
const ledger=load('apps/web/src/features/chart/lib/twelve-palace-ledger.ts');
const lab=load('apps/web/src/features/chart/lib/palace-study-workbench.ts');
const natal=()=>Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30,leap:false});
const fromChart=(chart,year=2026)=>ledger.buildTwelvePalaceLedger(chart,Engine.annualOverview(chart,year));
const plain=x=>JSON.parse(JSON.stringify(x));

test('study: four roles form unique valid branches and wrap 11 to 3/7/5',()=>{
  const r=plain(lab.studyRelationBranches(11));
  assert.deepEqual(r.map(x=>x.branchIndex),[11,3,7,5]);
  assert.deepEqual(r.map(x=>x.role),['focus','tam-hop-1','tam-hop-2','opposite']);
  for(let start=0;start<12;start++){
    const positions=lab.studyRelationBranches(start).map(x=>x.branchIndex);
    assert.equal(new Set(positions).size,4);
    assert.ok(positions.every(x=>x>=0&&x<12));
  }
});
test('study: invalid branches are rejected',()=>{
  for(const bad of [-1,12,0.5,NaN,Infinity])assert.throws(()=>lab.studyRelationBranches(bad),{name:'RangeError'});
});
test('study: main star cards always refer to exact engine record and editorial guide',()=>{
  const chart=natal(),rows=fromChart(chart);
  for(let branch=0;branch<12;branch++){
    const worksheet=lab.buildPalaceStudyWorksheet(rows,branch,guide,true);
    assert.equal(worksheet.perspectives.length,4);
    assert.equal(worksheet.focus.branchIndex,branch);
    assert.equal(worksheet.topicPath,`star-study-guide.json → palaces[${JSON.stringify(worksheet.focus.palace)}]`);
    for(const card of worksheet.cards){
      const row=rows.find(r=>r.branchIndex===card.branchIndex);
      assert.ok(row.records.some(x=>x.layer==='main'&&x.star===card.star&&x.sourcePath===card.evidencePath));
      assert.equal(card.motif,guide.stars[card.star].motif);
      assert.ok(card.editorialPath.includes(JSON.stringify(card.star)));
    }
  }
});
test('study: reversed chart order preserves original evidence positions',()=>{
  const chart=natal(),reverse={...chart,houses:[...chart.houses].reverse()},rows=fromChart(reverse);
  const branch=chart.houses[0].branchIndex;
  const worksheet=lab.buildPalaceStudyWorksheet(rows,branch,guide,true);
  for(const card of worksheet.cards){
    const match=card.evidencePath.match(/^houses\[(\d+)\]\.stars\[(\d+)\]$/);
    assert.ok(match,card.evidencePath);
    assert.equal(reverse.houses[Number(match[1])].stars[Number(match[2])],card.star);
    assert.equal(reverse.houses[Number(match[1])].branchIndex,card.branchIndex);
  }
});
test('study: focus mode does not leak star cards from linked palaces',()=>{
  const chart=natal(),rows=fromChart(chart),branch=3;
  const all=lab.buildPalaceStudyWorksheet(rows,branch,guide,true,'relations');
  const focus=lab.buildPalaceStudyWorksheet(rows,branch,guide,true,'focus');
  assert.equal(focus.cards.length,focus.focus.stars.length);
  assert.equal(all.cards.length,all.perspectives.reduce((n,p)=>n+p.stars.length,0));
  assert.ok(focus.cards.every(card=>card.branchIndex===branch));
  assert.equal(lab.worksheetEvidence(focus,'focus',true).every(record=>record.role==='focus'),true);
});
test('study: period toggles annual evidence and keeps natal data unchanged',()=>{
  const chart=natal(),rows=fromChart(chart),before=JSON.stringify(rows);
  const all=lab.buildPalaceStudyWorksheet(rows,0,guide,true);
  const birth=lab.buildPalaceStudyWorksheet(rows,0,guide,false);
  const allPaths=lab.worksheetEvidence(all,'relations',true).map(x=>x.path);
  const birthPaths=lab.worksheetEvidence(birth,'relations',false).map(x=>x.path);
  assert.ok(birthPaths.every(x=>!x.startsWith('annual.')));
  for(const p of birthPaths)assert.ok(allPaths.includes(p));
  assert.equal(JSON.stringify(rows),before);
});
test('study: missing editorial star never produces fabricated description',()=>{
  const rows=fromChart(natal());
  const original=rows[0].records.find(r=>r.layer==='main');
  const target=rows[0];
  const modified=rows.map(row=>row===target?{...row,records:[...row.records,{layer:'main',star:'Sao Không Có Trong Bảng',label:'Sao Không Có Trong Bảng',sourcePath:'houses[0].stars[999]'}]}:row);
  const result=lab.buildPalaceStudyWorksheet(modified,target.branchIndex,guide,false,'focus');
  assert.ok(result.uncovered.some(item=>item.star==='Sao Không Có Trong Bảng'));
  assert.ok(!result.cards.some(item=>item.star==='Sao Không Có Trong Bảng'));
  assert.ok(!result.cards.some(item=>item.star==='__proto__'));
  assert.ok(original||result.focus.stars.length>=1);
});
test('study: invalid rows and duplicates rejected even if source array is ordered',()=>{
  const rows=fromChart(natal());
  assert.throws(()=>lab.buildPalaceStudyWorksheet(rows.slice(1),2,guide,false),{name:'RangeError'});
  assert.throws(()=>lab.buildPalaceStudyWorksheet([...rows.slice(0,11),rows[0]],2,guide,false),{name:'RangeError'});
  assert.throws(()=>lab.buildPalaceStudyWorksheet(rows,12,guide,false),{name:'RangeError'});
});
test('study: Markdown includes observed sources, user note, privacy and limitations',()=>{
  const rows=fromChart(natal()),worksheet=lab.buildPalaceStudyWorksheet(rows,0,guide,true,'relations');
  const md=lab.exportStudyMarkdown(worksheet,'relations','Đối chiếu thêm khi có tài liệu.',true,2026);
  assert.match(md,/Đối chiếu thêm khi có tài liệu/);
  assert.match(md,/houses\[/);
  assert.match(md,/star-study-guide\.json/);
  assert.match(md,/Nguồn biên soạn/i);
  assert.ok(!md.includes('2004-08-15'));
  assert.ok(!md.includes('08:30'));
  assert.match(md,/không phải dự đoán khoa học/i);
  const noAnnual=lab.exportStudyMarkdown(lab.buildPalaceStudyWorksheet(rows,0,guide,false,'focus'),'focus','',false,2026);
  assert.ok(!noAnnual.includes('annual.luuTuHoa.items['));
  assert.match(noAnnual,/Chỉ năm sinh/);
});
test('study: UI is isolated, supports privacy and linked atlas; CSS basic mode hidden',()=>{
  const board=read('apps/web/src/features/chart/components/chart-board.tsx');
  const component=read('apps/web/src/features/chart/components/palace-study-workbench.tsx');
  const css=read('apps/web/src/app/palace-study-workbench.css');
  const layout=read('apps/web/src/app/layout.tsx');
  assert.ok(board.includes('<PalaceStudyWorkbench rows={ledgerRows}'));
  assert.ok(board.includes('const ledgerRows = useMemo'));
  assert.ok(layout.includes("import '" + [".", "/palace-study-workbench.css"].join("") + "'"));
  for(const token of ['aria-expanded={expanded}', 'aria-controls="thiendo-study-content"', 'aria-pressed={p.branchIndex===selectedBranch}', 'exportStudyMarkdown(', 'worksheetEvidence(', 'studyGuide', 'onSelect(p.branchIndex)', 'maxLength={4000}', 'role="status"']) assert.ok(component.includes(token),token);
  assert.match(css,/@media\(max-width:480px\)/);
  assert.match(css,/\.site\[data-mode="basic"\] \.palace-study-workbench/);
  assert.doesNotMatch(read('packages/astrology-engine/src/tuvi.js'),/palace-study-workbench/);
});
