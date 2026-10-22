'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const project=path.resolve(__dirname,'..');
let graph,metadata;
async function init(){ graph ||= await import('../infrastructure/scripts/workspace-contract.mjs'); metadata ||= await import('../infrastructure/scripts/release-metadata.mjs'); }
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-1154-'));
 const put=(file,obj)=>{const p=path.join(dir,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof obj==='string'?obj:JSON.stringify(obj,null,2)+'\n');};
 put('package.json',{name:'root',version:'1.0.0',private:true,workspaces:['packages/a','packages/b']});
 put('packages/a/package.json',{name:'@thiendo/a',version:'1.0.0',private:true,main:'src/index.cjs',dependencies:{'@thiendo/b':'file:../b'}});
 put('packages/b/package.json',{name:'@thiendo/b',version:'1.0.0',private:true,main:'src/index.cjs'});
 for(const p of ['packages/a/src/index.cjs','packages/b/src/index.cjs'])put(p,'module.exports={}\n');
 for(const [p,key] of metadata.ITEMS.slice(1))put(p,{[key]:'1.0.0',data:['preserve']});
 return {dir,put,read:file=>fs.readFileSync(path.join(dir,file),'utf8'),close:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('V11.54 all release metadata remains synchronized after version change',async()=>{
 await init();const result=metadata.auditReleaseMetadata(project);
 assert.equal(result.status,'PASS',result.errors.join('\n'));assert.equal(result.version,require('../package.json').version);
});
test('V11.54 package workspace contract still passes for the full repository',async()=>{
 await init();const r=graph.auditWorkspaceGraph(project);assert.equal(r.status,'PASS',r.errors.join('\n'));assert.equal(r.workspaces,9);
});
test('V11.54 workspace contract rejects symlinked entrypoints escaping workspace',async()=>{
 await init();const f=fixture();
 try{const outside=path.join(f.dir,'outside.cjs');fs.writeFileSync(outside,'module.exports={};');
 fs.rmSync(path.join(f.dir,'packages/a/src/index.cjs'));
 fs.symlinkSync(outside,path.join(f.dir,'packages/a/src/index.cjs'));
 assert.match(graph.auditWorkspaceGraph(f.dir).errors.join('\n'),/unsafe main entry/);
 }finally{f.close();}
});
test('V11.54 workspace contract rejects symlinked workspace entries outside repository',async()=>{
 await init();const f=fixture(),outside=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-external-'));
 try{fs.rmSync(path.join(f.dir,'packages/b'),{recursive:true,force:true});
 fs.mkdirSync(path.join(outside,'src'),{recursive:true});
 fs.writeFileSync(path.join(outside,'package.json'),JSON.stringify({name:'@thiendo/b',version:'1.0.0',private:true}));
 fs.symlinkSync(outside,path.join(f.dir,'packages/b'),'dir');
 assert.match(graph.auditWorkspaceGraph(f.dir).errors.join('\n'),/Workspace escapes root|outside declared workspaces/);
 }finally{f.close();fs.rmSync(outside,{recursive:true,force:true});}
});
test('V11.54 apply without regeneration updates all release keys in a consistent transaction',async()=>{
 await init();const f=fixture();try{const result=metadata.prepareRelease(f.dir,'11.54.0',{apply:true});
 assert.equal(result.status,'APPLIED');assert.equal(metadata.auditReleaseMetadata(f.dir).status,'PASS');
 }finally{f.close();}
});
test('V11.54 failed registry regeneration restores every previous byte',async()=>{
 await init();const f=fixture();try{
 const originals=new Map(metadata.ITEMS.map(([p])=>[p,f.read(p)]));
 assert.throws(()=>metadata.prepareRelease(f.dir,'11.54.0',{apply:true,regenerate:true}),/Star registry generation blocked/);
 for(const [name,body] of originals) assert.equal(f.read(name),body,`${name} must be rolled back`);
 }finally{f.close();}
});
test('V11.54 bootstrap install runs source checks after TypeScript dependencies are installed',()=>{
 const yaml=fs.readFileSync(path.join(project,'.github/workflows/bootstrap-lockfile.yml'),'utf8');
 const ci=yaml.indexOf('npm ci --no-audit --no-fund');
 const parser=yaml.indexOf('npm run check:release:source');
 assert.ok(ci>=0&&parser>ci,'source check must not require unavailable global TS before install');
 assert.match(yaml,/npm run audit:workspaces && npm run audit:release-metadata/);
});
test('V11.54 strict CI requires committed and validated lockfile, never auto-invents one',async()=>{
 const yaml=fs.readFileSync(path.join(project,'.github/workflows/ci.yml'),'utf8');
 assert.match(yaml,/Require committed npm lockfile/);
 assert.match(yaml,/npm ci --no-audit --no-fund/);
 if(fs.existsSync(path.join(project,'package-lock.json'))){
   const {validateRepositoryLock}=await import('../infrastructure/scripts/validate-lockfile.mjs');
   assert.deepEqual(validateRepositoryLock(project),[]);
 }
});

test('V11.54 partial registry overwrite followed by generator failure is fully rolled back',async()=>{
 await init();const f=fixture();try{
 const original=new Map(metadata.ITEMS.map(([p])=>[p,f.read(p)]));
 assert.throws(()=>metadata.prepareRelease(f.dir,'11.54.0',{apply:true,regenerate:true,
   runGenerator:root=>{fs.writeFileSync(path.join(root,'packages/knowledge/src/star-identity-registry.json'),'INVALID PARTIAL BUILD');return {status:3,stderr:'simulated interrupted registry writer'};}
 }),/Star registry generation blocked/);
 for(const [name,body] of original)assert.equal(f.read(name),body,`Partial artifact retained: ${name}`);
 }finally{f.close();}
});
test('V11.115.6 version preparation synchronizes existing lock roots without changing dependency bytes',async()=>{
 await init();const f=fixture();try{
 const dependency={version:'1.2.3',resolved:'https://registry.npmjs.org/a/-/a-1.2.3.tgz',integrity:'sha512-preserve'};
 f.put('package-lock.json',{name:'root',version:'1.0.0',lockfileVersion:3,packages:{'':{name:'root',version:'1.0.0'},'node_modules/a':dependency}});
 const original=f.read('package-lock.json');
 const preview=metadata.prepareRelease(f.dir,'11.115.6');assert.ok(preview.changes.includes('package-lock.json'));assert.equal(f.read('package-lock.json'),original);
 metadata.prepareRelease(f.dir,'11.115.6',{apply:true});const lock=JSON.parse(f.read('package-lock.json'));
 assert.equal(lock.version,'11.115.6');assert.equal(lock.packages[''].version,'11.115.6');assert.deepEqual(lock.packages['node_modules/a'],dependency);
 }finally{f.close()}
});
test('V11.115.6 failed regeneration restores existing lockfile byte for byte',async()=>{
 await init();const f=fixture();try{
 f.put('package-lock.json',{name:'root',version:'1.0.0',lockfileVersion:3,packages:{'':{name:'root',version:'1.0.0'}}});
 const original=f.read('package-lock.json');
 assert.throws(()=>metadata.prepareRelease(f.dir,'11.115.6',{apply:true,regenerate:true,runGenerator:()=>({status:1,stderr:'simulated failure'})}),/blocked/);
 assert.equal(f.read('package-lock.json'),original);assert.equal(JSON.parse(f.read('package.json')).version,'1.0.0');
 }finally{f.close()}
});
