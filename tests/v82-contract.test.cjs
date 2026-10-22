'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=x=>fs.readFileSync(path.join(root,x),'utf8');
test('chart input / result / board are separate React components',()=>{
 const page=src('apps/web/src/app/chart/page.tsx');
 assert.match(page,/import \{ ChartForm \} from/);
 assert.match(page,/import \{ ChartResult \} from/);
 assert.match(src('apps/web/src/features/chart/components/chart-form.tsx'),/function ChartForm/);
 assert.match(src('apps/web/src/features/chart/components/chart-result.tsx'),/function ChartResult/);
 assert.match(src('apps/web/src/features/chart/components/palace-tile.tsx'),/function PalaceTile/);
});
test('chart save uses frozen calculation input instead of a potentially edited form',()=>{
 const page=src('apps/web/src/app/chart/page.tsx');
 assert.match(page,/setCalculated\(snapshot\)/);
 assert.match(page,/chartApi\.save\(calculated\)/);
});
test('collection cancels requests to old selected charts',()=>{
 const col=src('apps/web/src/app/collection/page.tsx');
 assert.match(col,/detailRequest\.current\?\.abort\(\)/);
 assert.match(col,/chartApi\.get\(id, controller\.signal\)/);
 assert.match(col,/!controller\.signal\.aborted/);
});
test('V8.2 authentication KDF is async; registration policy does not break imported passwords',()=>{
 const a=src('apps/api/src/modules/auth/auth.service.ts');
 assert.match(a,/scrypt\(password, salt, 64/);
 assert.doesNotMatch(a,/scryptSync/);
 assert.match(a,/readPassword\(payload\.password, 'login'\)/);
 assert.match(a,/readPassword\(payload\.password, 'register'\)/);
});
test('unsaved calculation accepts birth fields without mandatory chart label',()=>{
 const s=src('apps/api/src/modules/charts/charts.service.ts');
 assert.match(s,/calculate\(body: unknown\) \{\s*const input = validBirth\(body\)/);
});
