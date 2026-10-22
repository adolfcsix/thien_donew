'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const vm=require('node:vm');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ts = require('./helpers-typeloader.cjs');
function load(file){
  const source=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(source,{module,exports:module.exports,require:name=>{throw new Error('Unexpected import '+name);}});
  return module.exports;
}
const ledger=load('apps/web/src/features/chart/lib/twelve-palace-ledger.ts');
const natal=()=>Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30,leap:false});
const annual=chart=>Engine.annualOverview(chart,2026);
const flat=items=>Array.from(items);

test('12-palace ledger: 12 unique branches, engine-derived only, source not mutated',()=>{
  const chart=natal(),year=annual(chart),before=JSON.stringify([chart,year]);
  const rows=ledger.buildTwelvePalaceLedger(chart,year);
  assert.equal(rows.length,12);
  assert.deepEqual(flat(rows.map(row=>row.branchIndex)),[0,1,2,3,4,5,6,7,8,9,10,11]);
  for(const row of rows){const h=chart.houses.find(h=>h.branchIndex===row.branchIndex);assert.equal(row.palace,h.palace);assert.equal(row.branch,h.branch);}
  assert.equal(JSON.stringify([chart,year]),before);
});
test('12-palace ledger: exact array-index path resolves against original chart order, including reversed chart',()=>{
  const chart=natal(),year=annual(chart);
  for(const reverse of [false,true]){
    const source=reverse?{...chart,houses:[...chart.houses].reverse()}:chart;
    for(const row of ledger.buildTwelvePalaceLedger(source,year)){
      for(const r of row.records){
        if(r.layer==='main'||r.layer==='auxiliary'||r.layer==='year'||r.layer==='additional'||r.layer==='traditional'||r.layer==='natal-extensions'||r.layer==='benefic'||r.layer==='positional'||r.layer==='derived'||r.layer==='missing-stars'||r.layer==='advanced'){
          const [,houseIndex,field,recordIndex]=r.sourcePath.match(/^houses\[(\d+)\]\.(stars|auxiliaryStars|yearStars|additionalStars|traditionalStars|natalExtensionStars|beneficStars|positionalStars|derivedStars|missingStars|advancedStars)\[(\d+)\]$/)||[];
          assert.notEqual(houseIndex,undefined,r.sourcePath);
          assert.equal(source.houses[Number(houseIndex)][field][Number(recordIndex)],r.star);
          assert.equal(source.houses[Number(houseIndex)].branchIndex,row.branchIndex);
        }else if(r.layer==='birth-transformation'){
          const [,houseIndex,recordIndex]=r.sourcePath.match(/^houses\[(\d+)\]\.tuHoa\[(\d+)\]$/)||[];
          assert.equal(source.houses[Number(houseIndex)].tuHoa[Number(recordIndex)].star,r.star);
          assert.equal(source.houses[Number(houseIndex)].tuHoa[Number(recordIndex)].name,r.transformation);
        }else{
          const [,kind,recordIndex]=r.sourcePath.match(/^annual\.(luuTuHoa|luuStars)\.items\[(\d+)\]$/)||[];
          const item=year[kind].items[Number(recordIndex)];
          assert.equal(item.branch,row.branchIndex);
          if(r.layer==='annual-star') assert.equal(item.name,r.star);
          else {assert.equal(item.star,r.star);assert.equal(item.name,r.transformation);}
        }
      }
    }
  }
});
test('12-palace ledger: all ten layers have stable labels, no duplicates',()=>{
  assert.equal(ledger.ledgerLayers.length,14);
  assert.equal(new Set(ledger.ledgerLayers.map(l=>l.id)).size,14);
  const rows=ledger.buildTwelvePalaceLedger(natal(),annual(natal()));
  for(const row of rows)for(const record of row.records)assert.ok(ledger.ledgerLayers.some(l=>l.id===record.layer));
});
test('12-palace ledger: source validation rejects missing, duplicated or invalid branches',()=>{
  const chart=natal(),year=annual(chart);
  assert.throws(()=>ledger.buildTwelvePalaceLedger({...chart,houses:chart.houses.slice(1)},year),{name:'RangeError'});
  assert.throws(()=>ledger.buildTwelvePalaceLedger({...chart,houses:[...chart.houses.slice(0,11),chart.houses[0]]},year),{name:'RangeError'});
  assert.throws(()=>ledger.buildTwelvePalaceLedger({...chart,houses:chart.houses.map((h,i)=>i===5?{...h,branchIndex:15}:h)},year),{name:'RangeError'});
});
test('12-palace ledger: Vietnamese accent-insensitive filtering respects selected layers',()=>{
  const chart=natal(),rows=ledger.buildTwelvePalaceLedger(chart,annual(chart)),all=ledger.ledgerLayers.map(l=>l.id);
  assert.equal(ledger.ledgerSearchKey('Địa CHI  Hóa'), 'dia chi  hoa');
  assert.equal(ledger.filterLedgerRows(rows,'',all).length,12);
  const menh=rows.find(x=>x.palace==='Mệnh');
  assert.ok(ledger.filterLedgerRows(rows,'menh',all).some(x=>x.branchIndex===menh.branchIndex));
  const star=rows.find(x=>x.records.some(r=>r.layer==='main'));
  const term=star.records.find(r=>r.layer==='main').star;
  assert.ok(ledger.filterLedgerRows(rows,term,['main']).some(x=>x.branchIndex===star.branchIndex));
  assert.equal(ledger.filterLedgerRows(rows,term,['annual-star']).some(x=>x.branchIndex===star.branchIndex) && !star.records.some(r=>r.layer==='annual-star' && r.star===term),false);
  assert.equal(ledger.filterLedgerRows(rows,'nothing-exists',all).length,0);
});
test('12-palace ledger: shared/exclusive names are exact inventory and do not mutate input',()=>{
  const rows=ledger.buildTwelvePalaceLedger(natal(),annual(natal()));
  const layers=['main','birth-transformation'];
  const a=rows[0],b=rows[6],before=JSON.stringify([a,b]);
  const compared=ledger.compareLedgerRows(a,b,layers);
  const names=x=>new Set(x.records.filter(r=>layers.includes(r.layer)).map(r=>r.star));
  const left=names(a),right=names(b);
  assert.deepEqual(flat(compared.shared),[...left].filter(x=>right.has(x)).sort((x,y)=>x.localeCompare(y,'vi')));
  assert.equal(compared.shared.length+compared.firstOnly.length,left.size);
  assert.equal(compared.shared.length+compared.secondOnly.length,right.size);
  assert.equal(JSON.stringify([a,b]),before);
});
test('12-palace ledger: absent natal targets are flagged but not fabricated',()=>{
  const chart=natal(),year=annual(chart),rows=ledger.buildTwelvePalaceLedger(chart,year);
  for(const row of rows){
    const natalSet=new Set(row.records.filter(r=>['main','auxiliary','year','additional','advanced'].includes(r.layer)).map(r=>r.star));
    for(const record of row.unmatchedTransformations){
      assert.ok(['birth-transformation','annual-transformation'].includes(record.layer));
      assert.equal(natalSet.has(record.star),false);
    }
  }
});
test('12-palace ledger: markers follow annual API on 12 branches',()=>{
  const chart=natal(),year=annual(chart),rows=ledger.buildTwelvePalaceLedger(chart,year);
  for(const row of rows){
    assert.equal(row.markers.includes('Lưu Thái Tuế'),row.branchIndex===year.luuThaiTueBranchIndex);
    assert.equal(row.markers.includes('Đại hạn'),row.branchIndex===year.activeDaiHan?.branchIndex);
    assert.equal(row.markers.includes('Tiểu hạn'),row.branchIndex===year.tieuHan.branchIndex);
  }
});
test('12-palace ledger: CSV uses BOM/CRLF, exact paths, no birth identifiers, escapes formulas',()=>{
  const chart=natal(),year=annual(chart),rows=ledger.buildTwelvePalaceLedger(chart,year);
  const csv=ledger.exportLedgerCsv(rows,['main','annual-transformation'],2026);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('\r\n'));
  assert.ok(csv.includes('houses['));
  assert.ok(!csv.includes('2004-08-15'));
  assert.ok(!csv.includes('08:30'));
  const mutated=structuredClone(rows[0]);mutated.palace='=HYPERLINK("bad","open")';
  const safe=ledger.exportLedgerCsv([mutated],['main'],2026);
  assert.ok(safe.includes('"\'=HYPERLINK(""bad"",""open"")"'),safe.slice(0,160));
});
test('12-palace ledger: board uses standalone module with accessibility and CSS breakpoints',()=>{
  const board=read('apps/web/src/features/chart/components/chart-board.tsx');
  const comp=read('apps/web/src/features/chart/components/twelve-palace-ledger.tsx');
  const css=read('apps/web/src/app/twelve-palace-ledger.css');
  const layout=read('apps/web/src/app/layout.tsx');
  assert.ok(board.includes('<TwelvePalaceLedger chart={result} annual={annual}'));
  assert.ok(layout.includes("import '" + [".","/twelve-palace-ledger.css"].join("") + "'"));
  for(const token of ['aria-expanded={expanded}', 'aria-controls="thiendo-ledger-content"', 'aria-pressed={row.branchIndex===selectedBranch}', 'exportLedgerCsv(visible,layers,annual.year,{includeTechnical:false})', 'onSelect(row.branchIndex)', 'compareLedgerRows(current,target,layers)'])assert.ok(comp.includes(token),token);
  assert.match(css,/@media\(max-width:540px\)/);
  assert.match(css,/\.site\[data-mode="basic"\]/);
});
