/** V11.164 high-confidence leak check. No secret material is printed in CI logs. */
import {readdirSync,readFileSync,lstatSync} from 'node:fs';
import {join,relative} from 'node:path';
const root=process.cwd(),issues=[];
const excluded=new Set(['.git','node_modules','.next','dist','coverage','browser-evidence','.cache','.turbo','docs/reports']);
const safeEnv=new Set(['.env.example','.env.local.example','.env.production.example','.env.e2e.example']);
const tested=/\.(?:json|js|cjs|mjs|ts|tsx|md|ya?ml|sh|bat|ps1|txt)$/i;
let inspected=0;
function walk(dir){for(const name of readdirSync(dir)){
 const abs=join(dir,name),rel=relative(root,abs).replaceAll('\\','/');
 if(excluded.has(name)||excluded.has(rel))continue;
 const st=lstatSync(abs);if(st.isSymbolicLink())continue;
 if(st.isDirectory()){walk(abs);continue;}
 if(!st.isFile())continue;
 if((/^\.env(?:\.|$)/.test(name)&&!safeEnv.has(name))||/\.(?:p12|pfx|pem|key)$/i.test(name))issues.push(rel+': sensitive file');
 if(!tested.test(name)||st.size>2*1024*1024)continue;
 const data=readFileSync(abs,'utf8');inspected++;
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(data))issues.push(rel+': private key block');
 if(/AIza[0-9A-Za-z_\-]{35}/.test(data))issues.push(rel+': provider API key token');
 if(/\bghp_[a-zA-Z0-9]{36}\b/.test(data))issues.push(rel+': GitHub token');
 if(/\bsk-[a-zA-Z0-9]{30,}\b/.test(data))issues.push(rel+': secret token');
 }}
walk(root);
if(issues.length){for(const x of issues)console.error('BLOCKED: '+x);process.exitCode=1;}
else console.log(`PASS: scanned ${inspected} source/config/document files for high-confidence secret material and unexpected env/private-key files`);
console.log('Scope: heuristic scan, not credential rotation or a full specialized secrets audit.');
