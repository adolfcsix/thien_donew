const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
test('packaging discards stale HTML/RSC cache while preserving current app output, assets and user files',async()=>{
 const {packageWebArtifact}=await import('../infrastructure/scripts/package-web-artifact.mjs');const app=await fs.mkdtemp(path.join(os.tmpdir(),'thiendo-artifact-'));const output=path.join(app,'.next/standalone/apps/web');
 try{
  const files={'.next/standalone/apps/web/server.js':'server','.next/server/route-cache/old/page.html':'old-source-cache','.next/standalone/apps/web/.next/server/route-cache/old/page.rsc':'old-standalone-cache','.next/server/app/admin/finance.html':'current-html','.next/standalone/apps/web/.next/server/app/admin/finance.html':'current-html','.next/static/chunks/new.js':'current-js','public/brand.svg':'current-brand','private/database-backup.sql':'private-data'};
  for(const [file,body] of Object.entries(files)){await fs.mkdir(path.dirname(path.join(app,file)),{recursive:true});await fs.writeFile(path.join(app,file),body);}
  await packageWebArtifact(app);
  for(const rel of ['.next/server/route-cache','.next/standalone/apps/web/.next/server/route-cache'])await assert.rejects(fs.stat(path.join(app,rel)),{code:'ENOENT'});
  for(const rel of ['.next/server/app/admin/finance.html','.next/standalone/apps/web/.next/server/app/admin/finance.html','private/database-backup.sql'])assert.equal(await fs.readFile(path.join(app,rel),'utf8'),files[rel]);
  assert.equal(await fs.readFile(path.join(output,'.next/static/chunks/new.js'),'utf8'),'current-js');assert.equal(await fs.readFile(path.join(output,'public/brand.svg'),'utf8'),'current-brand');
 }finally{await fs.rm(app,{recursive:true,force:true});}
});
test('incomplete standalone build is rejected before any route cache is removed',async()=>{
 const {packageWebArtifact}=await import('../infrastructure/scripts/package-web-artifact.mjs');const app=await fs.mkdtemp(path.join(os.tmpdir(),'thiendo-artifact-missing-'));
 try{await fs.mkdir(path.join(app,'.next/server/route-cache'),{recursive:true});await fs.writeFile(path.join(app,'.next/server/route-cache/current'),'retain');await assert.rejects(packageWebArtifact(app),{code:'ENOENT'});assert.equal(await fs.readFile(path.join(app,'.next/server/route-cache/current'),'utf8'),'retain');}finally{await fs.rm(app,{recursive:true,force:true});}
});
