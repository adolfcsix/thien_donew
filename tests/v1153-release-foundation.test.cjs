'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
let graph,release;
const init=async()=>{graph ||= await import('../infrastructure/scripts/workspace-contract.mjs'); release ||= await import('../infrastructure/scripts/release-metadata.mjs');};
const mk=()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-1153-'));
 const put=(file,json)=>{const p=path.join(dir,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(json,null,2)+'\n');};
 put('package.json',{name:'test-root',version:'1.0.0',private:true,workspaces:['packages/a','packages/b']});
 put('packages/a/package.json',{name:'@thiendo/a',version:'1.0.0',private:true,main:'src/index.cjs',dependencies:{'@thiendo/b':'file:../b'}});
 put('packages/b/package.json',{name:'@thiendo/b',version:'1.0.0',private:true,main:'src/index.cjs'});
 for(const file of ['packages/a/src/index.cjs','packages/b/src/index.cjs']){const p=path.join(dir,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,'module.exports={};\n');}
 for(const [file,key] of release.ITEMS.slice(1))put(file,{[key]:'1.0.0'});
 return {dir,put,read:f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')),close:()=>fs.rmSync(dir,{recursive:true,force:true})};
};
const edit=(f,manifest,fn)=>{const p=path.join(f.dir,manifest);const d=JSON.parse(fs.readFileSync(p,'utf8'));fn(d);f.put(manifest,d);};
test('V11.53 existing workspace dependency graph is valid without any network',async()=>{
 await init();const r=graph.auditWorkspaceGraph(root);assert.equal(r.status,'PASS',r.errors.join('\n'));assert.equal(r.workspaces,9);assert.ok(r.internalEdges>=10);
});
test('V11.53 all release snapshot metadata is synchronized',async()=>{
 await init();const r=release.auditReleaseMetadata(root);assert.equal(r.status,'PASS',r.errors.join('\n'));assert.equal(r.version,JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version);assert.equal(r.items.length,4);
});
test('V11.53 workspace contract accepts a correctly named local file dependency',async()=>{
 await init();const f=mk();try{const r=graph.auditWorkspaceGraph(f.dir);assert.equal(r.status,'PASS');assert.equal(r.internalEdges,1);}finally{f.close();}
});
test('V11.53 refuses workspace name mismatch even when file path exists',async()=>{
 await init();const f=mk();try{edit(f,'packages/a/package.json',j=>{j.dependencies['@thiendo/wrong']='file:../b';delete j.dependencies['@thiendo/b'];});assert.match(graph.auditWorkspaceGraph(f.dir).errors.join('\n'),/name mismatch/);}finally{f.close();}
});
test('V11.53 refuses path traversal out of declared workspaces',async()=>{
 await init();const f=mk();try{edit(f,'packages/a/package.json',j=>j.dependencies['@thiendo/b']='file:../../../unsafe');assert.match(graph.auditWorkspaceGraph(f.dir).errors.join('\n'),/outside declared workspaces/);}finally{f.close();}
});
test('V11.53 detects cycles through first-party workspaces',async()=>{
 await init();const f=mk();try{edit(f,'packages/b/package.json',j=>j.dependencies={'@thiendo/a':'file:../a'});assert.match(graph.auditWorkspaceGraph(f.dir).errors.join('\n'),/dependency cycle/);}finally{f.close();}
});
test('V11.53 rejects internal scoped packages resolved through transitive registry',async()=>{
 await init();const f=mk();try{edit(f,'packages/a/package.json',j=>j.dependencies['@thiendo/b']='^1.0.0');assert.match(graph.auditWorkspaceGraph(f.dir).errors.join('\n'),/must use a declared file/);}finally{f.close();}
});
test('V11.53 rejects missing package entry points',async()=>{
 await init();const f=mk();try{edit(f,'packages/a/package.json',j=>j.main='dist/index.js');assert.match(graph.auditWorkspaceGraph(f.dir).errors.join('\n'),/Missing or unsafe main entry/);}finally{f.close();}
});
test('V11.53 rejects nonprivate workspaces to avoid accidental publication',async()=>{
 await init();const f=mk();try{edit(f,'packages/a/package.json',j=>j.private=false);assert.match(graph.auditWorkspaceGraph(f.dir).errors.join('\n'),/must remain private/);}finally{f.close();}
});
test('V11.53 rejects duplicate workspace identities',async()=>{
 await init();const f=mk();try{edit(f,'packages/b/package.json',j=>j.name='@thiendo/a');assert.match(graph.auditWorkspaceGraph(f.dir).errors.join('\n'),/duplicate workspace name/);}finally{f.close();}
});
test('V11.53 release audit detects stale star registry snapshot',async()=>{
 await init();const f=mk();try{edit(f,'packages/knowledge/src/star-identity-registry.json',j=>j.release='0.9.0');assert.match(release.auditReleaseMetadata(f.dir).errors.join('\n'),/star-identity-registry/);}finally{f.close();}
});
test('V11.53 release audit rejects malformed version fields',async()=>{
 await init();const f=mk();try{edit(f,'packages/knowledge/src/school-review-registry.json',j=>j.edition='unverified');assert.match(release.auditReleaseMetadata(f.dir).errors.join('\n'),/invalid edition/);}finally{f.close();}
});
test('V11.53 release version updater is read-only by default',async()=>{
 await init();const f=mk();try{const before=fs.readFileSync(path.join(f.dir,'package.json'),'utf8');const r=release.prepareRelease(f.dir,'2.0.0');assert.equal(r.status,'DRY_RUN');assert.equal(fs.readFileSync(path.join(f.dir,'package.json'),'utf8'),before);}finally{f.close();}
});
test('V11.53 release version updater changes all four metadata locations',async()=>{
 await init();const f=mk();try{const r=release.prepareRelease(f.dir,'2.1.0',{apply:true});assert.equal(r.status,'APPLIED');assert.equal(r.validated,4);assert.equal(release.auditReleaseMetadata(f.dir).status,'PASS');assert.equal(f.read('packages/knowledge/src/school-validation-protocols.json').edition,'2.1.0');}finally{f.close();}
});
test('V11.53 version updater rejects nonsemantic injection and leaves files untouched',async()=>{
 await init();const f=mk();try{assert.throws(()=>release.prepareRelease(f.dir,'11.53.0; rm -rf',{apply:true}),/Version must/);assert.equal(f.read('package.json').version,'1.0.0');}finally{f.close();}
});
test('V11.53 release gate checks workspace and metadata contracts before reporting source PASS',()=>{
 const s=fs.readFileSync(path.join(root,'infrastructure/scripts/verify-release.mjs'),'utf8');
 assert.match(s,/Workspace dependency contract/);assert.match(s,/Release metadata synchronization/);
 assert.match(s,/audit-release-metadata\.mjs/);assert.match(s,/workspace-contract\.mjs/);
});
test('V11.53 a future committed lockfile is validated instead of causing test failure',async()=>{
 const flow=fs.readFileSync(path.join(root,'.github/workflows/bootstrap-lockfile.yml'),'utf8');
 assert.match(flow,/npm install --package-lock-only/);assert.match(flow,/npm ci --no-audit/);
 if(fs.existsSync(path.join(root,'package-lock.json'))){
   const {validateRepositoryLock}=await import('../infrastructure/scripts/validate-lockfile.mjs');
   assert.deepEqual(validateRepositoryLock(root),[], 'A committed lockfile must pass structural validation');
 }
});
