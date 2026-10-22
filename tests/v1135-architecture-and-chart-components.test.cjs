'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const components='apps/web/src/features/chart/components/';
const {importSpecifiers,violationFor}=require('../infrastructure/scripts/lib/architecture-boundaries.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');

test('V11.35: actual packages and frontend/backend respect ownership boundaries',()=>{
  const report=JSON.parse(execFileSync(process.execPath,['infrastructure/scripts/audit-architecture.cjs','--json'],{cwd:root,encoding:'utf8'}));
  assert.equal(report.violations.length,0);
  assert.ok(report.files>100 && report.imports>200);
  assert.match(report.limitations,/Static/);
});
test('V11.35: boundary guard catches reversed dependency and repository escapes',()=>{
  const src=path.join(root,'packages/star-audit/src/index.cjs');
  const web=path.join(root,'apps/web/src/components/demo.tsx');
  const api=path.join(root,'apps/api/src/demo.ts');
  assert.match(violationFor(root,src,'../../../apps/web/src/lib/item.json'),/package imports/);
  assert.match(violationFor(root,src,'../../../tests/fixtures/data.json'),/package imports/);
  assert.match(violationFor(root,web,'../../../api/src/common/database.service'),/frontend imports/);
  assert.match(violationFor(root,api,'../../web/src/app/page'),/backend imports/);
  assert.equal(violationFor(root,src,'../../knowledge/src/star-study-guide.json'),null);
  assert.deepEqual(importSpecifiers("import type {X} from " + "'../x'; const Y=require(" + "'../../apps/web/z');"),['../x','../../apps/web/z']);
});
test('V11.35: study guide is canonical in knowledge and still covers 14 × 12',()=>{
  assert.equal(fs.existsSync(path.join(root,'apps/web/src/lib/star-study-guide.json')),false);
  const guide=require('../packages/knowledge/src/star-study-guide.json');
  assert.equal(Object.keys(guide.stars).length,14);
  assert.equal(Object.keys(guide.palaces).length,12);
  assert.equal(Object.keys(guide.stars).length*Object.keys(guide.palaces).length,168);
  assert.match(read('apps/web/src/app/star-atlas/page.tsx'),/from '@thiendo\/knowledge\/src\/star-study-guide.json'/);
  assert.match(read('packages/star-audit/src/index.cjs'),/require\('\.\.\/\.\.\/knowledge\/src\/star-study-guide.json'\)/);
});
test('V11.35: engine baseline fixture belongs to auditing package, not tests',()=>{
  assert.equal(fs.existsSync(path.join(root,'tests/fixtures/v1112/chart-baselines.json')),false);
  const fixture=require('../packages/star-audit/fixtures/chart-baselines.json');
  assert.equal(fixture.cases.length,22);
  assert.equal(fixture.expertReviewed,false);
  assert.match(read('infrastructure/scripts/chart-baselines-v1112.cjs'),/packages\/star-audit\/fixtures\/chart-baselines.json/);
  const output=execFileSync(process.execPath,['infrastructure/scripts/chart-baselines-v1112.cjs'],{cwd:root,encoding:'utf8'});
  assert.equal(JSON.parse(output).caseCount,22);
});
test('V11.35: independent controls have complete callback wiring and remain accessible',()=>{
  const board=read(components+'chart-board.tsx');
  const controls=read(components+'chart-display-controls.tsx');
  for(const property of ['onBoardSkinChange={setBoardSkin}','onChartTextSizeChange={setChartTextSize}',
    'onToggleInsightDock','onToggleRelationLines','onOpenReader={() => setReaderOpen(true)}','onFocusScopeChange={setFocusScope}']) {
    assert.ok(board.includes(property),property);
  }
  for(const attribute of ['aria-haspopup="dialog"','aria-expanded={showInsightDock}',
    'aria-pressed={showRelationLines}',"onFocusScopeChange('tu-chinh')", "onFocusScopeChange('tam-hop')",
    "onChartTextSizeChange('large')", "onBoardSkinChange('jade')"]) assert.ok(controls.includes(attribute),attribute);
  assert.equal((controls.match(/className="chart-room-controls"/g)||[]).length,1);
  assert.doesNotMatch(controls,/useState\(|useEffect\(|Engine\.|annualOverview\(|setSelectedBranch\(/);
});
test('V11.35: pure relation navigation and star legend preserve original information hierarchy',()=>{
  const board=read(components+'chart-board.tsx');
  const nav=read(components+'chart-relation-navigation.tsx');
  const legend=read(components+'chart-strength-legend.tsx');
  assert.match(board,/<ChartRelationNavigation selectedHouse=\{selectedHouse\} tamHopHouses=\{tamHopHouses\}/);
  assert.match(board,/doiCungHouse=\{doiCungHouse\} onSelect=\{selectHouse\}/);
  assert.match(nav,/tamHopHouses\.map\(house => <button key=\{house.branchIndex\}/);
  assert.match(nav,/doiCungHouse && <button/);
  assert.match(nav,/onSelect\(house.branchIndex\)/);
  assert.match(legend,/Miếu/);
  for(const value of ['Vượng','Đắc','Bình','Hãm'])assert.ok(legend.includes(value));
  assert.match(board,/\{showStrength && <ChartStrengthLegend \/>\}/);
  assert.doesNotMatch(nav+legend,/Engine\.|calculate\(|useState\(|useEffect\(/);
});
test('V11.35: canonical data can be fingerprinted without producing a second copy',()=>{
  const guide=read('packages/knowledge/src/star-study-guide.json');
  const fixture=read('packages/star-audit/fixtures/chart-baselines.json');
  assert.match(hash(guide),/^[a-f\d]{64}$/);
  assert.match(hash(fixture),/^[a-f\d]{64}$/);
  assert.equal(read('infrastructure/scripts/build-star-registry.cjs').includes("const mainStudy = 'packages/knowledge/src/star-study-guide.json'"),true);
  const registry=require('../packages/knowledge/src/star-identity-registry.json');
  assert.ok(registry.records.some(r=>r.editorialSources?.includes('packages/knowledge/src/star-study-guide.json')));
  assert.equal(registry.records.some(r=>r.editorialSources?.includes('apps/web/src/lib/star-study-guide.json')),false);
});
