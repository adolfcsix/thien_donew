'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('monorepo has separate packages and apps',()=>{const p=JSON.parse(read('package.json'));for(const required of ['apps/web','apps/api','packages/astrology-engine','packages/shared-types'])assert.ok(p.workspaces.includes(required),required);assert.equal(new Set(p.workspaces).size,p.workspaces.length);});
test('frontend not bundled with database credentials',()=>{const source=read('apps/web/src/lib/api.ts');assert.doesNotMatch(source,/DATABASE_URL|POSTGRES_PASSWORD|password_hash/);});
test('backend owns authorization / tenant filter',()=>{const charts=read('apps/api/src/modules/charts/charts.service.ts');assert.match(charts,/user_id=\$2/);assert.match(charts,/user_id=\$1/);assert.match(charts,/resultVerified\(input\)/);});
test('database schema has ownership & constraints',()=>{const schema=read('infrastructure/db/001_core.sql');assert.match(schema,/REFERENCES users\(id\) ON DELETE CASCADE/);assert.match(schema,/CHECK\(hour BETWEEN 0 AND 23\)/);});
test('no personal SQLite data packaged in legacy folder',()=>{assert.equal(fs.existsSync(path.join(root,'tests/compat/data/thiendo.sqlite')),false);});
