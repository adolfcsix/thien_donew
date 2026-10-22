'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..','apps/web/src/features/chart/components');
const read=file=>readFileSync(path.join(base,file),'utf8');

test('refactor: chart-board orchestrates the chart but delegates rendering to dedicated components',()=>{
  const board=read('chart-board.tsx');
  for(const part of ['palace-tile','board-summary','palace-details']) {
    assert.match(board,new RegExp(`from './${part}'`));
    assert.ok(existsSync(path.join(base,part+'.tsx')));
  }
  for(const marker of ['function PalaceTile(','function BoardSummary(','function PalaceDetails(','function AstrologyGroup(']) {
    assert.ok(!board.includes(marker), `Unexpected duplicate renderer in chart-board: ${marker}`);
  }
  assert.match(board,/export function ChartBoard\(/);
});
test('refactor: palace tile still displays all star layers and protects pointer interactions',()=>{
  const tile=read('palace-tile.tsx');
  for(const fragment of [
    'house.auxiliaryStars','house.yearStars','house.additionalStars','house.tuHoa',
    'house.cycleStars.trangSinh','house.daiHan','onMouseEnter={onPreviewStart}',
    'onMouseLeave={onPreviewEnd}','data-branch={house.branchIndex}',
    'houseAccentStyle(house.cell, house.branchIndex)',
  ]) assert.ok(tile.includes(fragment),`Missing ${fragment}`);
  assert.doesNotMatch(tile,/<Link /,'Clickable palace tiles must not contain nested links');
});
test('refactor: details and center keep their independent source-data fields',()=>{
  const details=read('palace-details.tsx');
  const center=read('board-summary.tsx');
  for(const term of ['mainStarStrengths','additionalStarDetails','annual.luuStars','/star-atlas','Các vị trí sao là dữ liệu đã an'])
    assert.ok(details.includes(term),`Missing details field ${term}`);
  for(const term of ['result.solar','result.lunar','result.yearCanChi','result.cuc.name','annual.year'])
    assert.ok(center.includes(term),`Missing center field ${term}`);
});
test('refactor: source-facing star groups are shared by tile and detail, never copied',()=>{
  const tile=read('palace-tile.tsx'),detail=read('palace-details.tsx'),group=read('star-groups.tsx');
  assert.match(tile,/import \{ AstrologyGroup, MainStarGroup \} from '\.\/star-groups'/);
  assert.match(detail,/import \{ AstrologyGroup \} from '\.\/star-groups'/);
  assert.match(group,/export function AstrologyGroup\(/);
  assert.match(group,/export function MainStarGroup\(/);
  assert.doesNotMatch(tile,/function AstrologyGroup\(/);
  assert.doesNotMatch(detail,/function AstrologyGroup\(/);
});
