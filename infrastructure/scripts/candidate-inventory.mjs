/** Static trace inventory, never a claim that every endpoint passed E2E. */
import {readFileSync,readdirSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),require=createRequire(import.meta.url),ts=require('typescript');
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(join(dir,x.name)):[join(dir,x.name)]);}
const web=files(resolve(root,'apps/web/src')).filter(p=>/\.(tsx?|cjs)$/.test(p)).map(p=>({path:relative(root,p),text:readFileSync(p,'utf8')}));
const tests=files(resolve(root,'tests')).filter(p=>/\.(cjs|mjs)$/.test(p)).map(p=>({path:relative(root,p),text:readFileSync(p,'utf8')}));
const {requestCapability}=require(resolve(root,'apps/api/dist/modules/admin-console/permissions.js'));const rows=[];
for(const file of files(resolve(root,'apps/api/src')).filter(p=>p.endsWith('.controller.ts'))){
 const source=readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 for(const cls of ast.statements.filter(ts.isClassDeclaration)){
  const dec=ts.getDecorators(cls)?.find(d=>ts.isCallExpression(d.expression)&&d.expression.expression.getText(ast)==='Controller');if(!dec)continue;
  const prefix=dec.expression.arguments[0]?.text||'';
  for(const member of cls.members.filter(ts.isMethodDeclaration))for(const d of ts.getDecorators(member)||[]){
   if(!ts.isCallExpression(d.expression))continue;const verb=d.expression.expression.getText(ast);if(!['Get','Post','Patch','Put','Delete','Head','Options'].includes(verb))continue;
   const route='/'+[prefix,d.expression.arguments[0]?.text||''].filter(Boolean).join('/'),method=member.name.getText(ast),text=member.body?.getText(ast)||'';
   const calls=[...text.matchAll(/this\.(\w+)\.(\w+)\(/g)].map(m=>m[1]+'.'+m[2]);
   const services=files(dirname(file)).filter(p=>p.endsWith('.service.ts'));const serviceText=services.map(p=>readFileSync(p,'utf8')).join('\n');
   const tables=[...new Set([...serviceText.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z_0-9]*)/gi)].map(m=>m[1].toLowerCase()))].filter(t=>!['set','select','jsonb','of'].includes(t));
   const admin=/\/admin(?:\/|$)|\/moderation(?:\/|$)/.test(route),capability=admin?requestCapability({originalUrl:route,method:verb.toUpperCase()}):null;
   const references=web.filter(x=>x.text.includes('/'+prefix)).map(x=>x.path);
   const witnesses=tests.filter(x=>x.text.includes('/'+prefix)||x.text.includes(cls.name?.text||'UNMATCHED')).map(x=>x.path);
   rows.push({verb:verb.toUpperCase(),route,controller:relative(root,file)+'#'+method,serviceCalls:calls,services:services.map(p=>relative(root,p)),moduleTables:tables,capability:capability|| (admin?'membership/MFA + explicit service policy':'service-specific identity/ownership/access'),frontendModuleReferences:references,testReferences:witnesses,verification:'STATIC_REFERENCE_ONLY; use current report/browser/SQL evidence for runtime status'});
  }
 }
}
const out=resolve(root,'docs/current');mkdirSync(out,{recursive:true});
writeFileSync(join(out,'endpoint-matrix.json'),JSON.stringify({kind:'static inventory',routes:rows.length,limitations:'Tables/references are module-level hints, not a proof of per-method authorization or E2E coverage.',rows},null,2)+'\n');
const keys=['verb','route','controller','serviceCalls','services','moduleTables','capability','frontendModuleReferences','testReferences','verification'];const csv=v=>'"'+String(Array.isArray(v)?v.join(' | '):v??'').replaceAll('"','""')+'"';writeFileSync(join(out,'endpoint-matrix.csv'),keys.join(',')+'\n'+rows.map(r=>keys.map(k=>csv(r[k])).join(',')).join('\n')+'\n');
console.log(JSON.stringify({status:'PASS',routes:rows.length,controllers:new Set(rows.map(r=>r.controller.split('#')[0])).size,kind:'STATIC_REFERENCE_ONLY',output:'docs/current/endpoint-matrix.json'}));
