const {test}=require('node:test');const assert=require('node:assert/strict');
const load=()=>import('../infrastructure/scripts/source-import-policy.mjs');
test('only the two known generated Next declarations are deferred in its stub',async()=>{
 const {isNextGeneratedTypeImport:check}=await load();
 for(const specifier of ['./.next/types/routes.d.ts','./.next/types/root-params.d.ts'])assert.equal(check('apps/web/next-env.d.ts',specifier),true);
});
test('real app imports must still exist even when they point inside .next',async()=>{
 const {isNextGeneratedTypeImport:check}=await load();assert.equal(check('apps/web/src/app/page.tsx','./.next/types/routes.d.ts'),false);assert.equal(check('apps/api/next-env.d.ts','./.next/types/routes.d.ts'),false);
});
test('unknown, parent-traversal and ordinary relative imports are never exempt',async()=>{
 const {isNextGeneratedTypeImport:check}=await load();
 for(const specifier of ['./.next/types/unknown.d.ts','../.next/types/routes.d.ts','./missing.ts','./.next/types/../../missing.d.ts'])assert.equal(check('apps/web/next-env.d.ts',specifier),false);
});
test('the same narrow policy works for Windows source paths',async()=>{
 const {isNextGeneratedTypeImport:check}=await load();assert.equal(check('apps\\web\\next-env.d.ts','./.next/types/routes.d.ts'),true);
});
test('SQL build exceptions require a known harness and exact compiled module',async()=>{
 const {deferredSqlTestSource:check}=await load();
 assert.equal(check('tests/v1116419-sql.test.mjs','../apps/api/dist/modules/auth/auth.service.js'),'apps/api/src/modules/auth/auth.service.ts');
 assert.equal(check('tests/v1116421-dashboard-sql.test.mjs','../apps/api/dist/modules/admin-insights/dashboard-snapshot.js'),'apps/api/src/modules/admin-insights/dashboard-snapshot.ts');
 for(const file of ['apps/web/src/app/page.tsx','tests/unknown.mjs'])assert.equal(check(file,'../apps/api/dist/modules/auth/auth.service.js'),null);
 for(const spec of ['../apps/api/dist/modules/auth/unknown.js','../apps/api/dist/modules/../auth/auth.service.js'])assert.equal(check('tests/v1116419-sql.test.mjs',spec),null);
});
