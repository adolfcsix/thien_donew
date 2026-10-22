#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {importSpecifiers,violationFor}=require('./lib/architecture-boundaries.cjs');
const root=path.resolve(__dirname,'../..');
const extensions=/\.(?:ts|tsx|js|cjs|mjs)$/;
function scan(directory,files=[]){
  if(!fs.existsSync(directory))return files;
  for(const dirent of fs.readdirSync(directory,{withFileTypes:true})){
    if(dirent.name==='node_modules'||dirent.name==='dist'||dirent.name==='.next')continue;
    const absolute=path.join(directory,dirent.name);
    if(dirent.isDirectory())scan(absolute,files);
    else if(dirent.isFile()&&extensions.test(dirent.name))files.push(absolute);
  }
  return files;
}
const files=['apps/web/src','apps/api/src','packages'].flatMap(p=>scan(path.join(root,p)));
const violations=[];let imports=0;
for(const file of files){
  for(const specifier of importSpecifiers(fs.readFileSync(file,'utf8'))){
    imports++;
    const error=violationFor(root,file,specifier);
    if(error)violations.push({from:path.relative(root,file).replaceAll('\\','/'),specifier,error});
  }
}
const report={schemaVersion:1,inspection:'static-application-package-boundaries',files:files.length,imports,violations,
  limitations:'Static literal imports only; full TypeScript bundling and runtime E2E are not covered.'};
if(process.argv.includes('--json')) console.log(JSON.stringify(report,null,2));
else console.log(`Architecture: ${files.length} files, ${imports} imports, ${violations.length} violations. ${violations.length?'FAIL':'PASS'}`);
if(violations.length){violations.forEach(v=>console.error(`${v.from}: ${v.error}`));process.exitCode=1;}
