'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
/** Retain the pre-A43 frozen hashes after removing ONLY the explicitly approved
 * controller/service registrations and local workspace dependency declaration.
 * All pre-existing registrations and resolved third-party dependencies stay frozen. */
function baselineBytes(root,file){
 const bytes=fs.readFileSync(path.join(root,file));if(!['apps/api/src/app.module.ts','package-lock.json'].includes(file))return bytes;
 let source=bytes.toString('utf8');
 if(file==='apps/api/src/app.module.ts'){
  for(const token of ["import {SecureCalculationsController} from './modules/secure-calculations/secure-calculations.controller';\n","import {SecureCalculationsService} from './modules/secure-calculations/secure-calculations.service';\n"]){assert.equal(source.split(token).length,2,token);source=source.replace(token,'');}
  for(const token of ['controllers: [SecureCalculationsController,','providers: [SecureCalculationsService,']){assert.equal(source.split(token).length,2,token);source=source.replace(token,token.split('Secure')[0]);}
 }else if(file==='package-lock.json'){
  const lock=JSON.parse(source),deps=lock.packages['apps/api'].dependencies;assert.equal(deps['@thiendo/interpretation'],'file:../../packages/interpretation');delete deps['@thiendo/interpretation'];source=JSON.stringify(lock,null,2)+'\n';
 }
 return Buffer.from(source);
}
module.exports={baselineBytes};
