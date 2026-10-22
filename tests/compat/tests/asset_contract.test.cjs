const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'apps/web');
test('V7 frontend has complete script order and real account integration',()=>{
 const page=fs.readFileSync(path.join(web,'index.html'),'utf8');
 const scripts=[...page.matchAll(/<script defer src="([^"]+)"/g)].map(x=>x[1]);
 const required=['engine/lunar.js','engine/auxiliary.js','engine/tuhoa.js','engine/cycles.js','engine/year-stars.js','engine/tuvi.js','engine/verify.js','assets/state-nav.js','assets/chart-ui.js','assets/pages.js','assets/account.js','assets/app.js'];
 assert.deepEqual(scripts,required);
 assert.ok(page.includes('accountToggle'));
 for(const f of [...scripts,'assets/styles.css','assets/account.css']){const file=f.startsWith('engine/')?require('../packages/engine/assets.cjs').browserEnginePath(path.basename(f,'.js')):path.join(web,f);assert.ok(file&&fs.existsSync(file),'Missing '+f);}
 const legacy=fs.readFileSync(path.join(root,'legacy-v6-offline.html'),'utf8');
 assert.ok(legacy.includes('ThienDoYearStars'));
});
