'use strict';
const {readFileSync,existsSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'../..');
const matrix=JSON.parse(readFileSync(resolve(root,'packages/knowledge/src/method-coverage.json'),'utf8'));
const errors=[],ids=new Set(),allowedPhases=new Set(['V11.152','V11.153','V11.154']);
for(const row of matrix.disciplines){
 if(ids.has(row.id)||!allowedPhases.has(row.phase)||!row.methodId||!row.methodScope||!row.witnessGate)errors.push('Unreviewed/duplicate method: '+row.id);
 ids.add(row.id);
 for(const [key,path] of [['engine',row.implementation],['page',row.webRouteSource],['test',row.candidateTest]]){
  const exists=existsSync(resolve(root,path));
  if(exists!==row.pathsPresent[key])errors.push('Stale inventory path: '+row.id+':'+key);
  if(!exists)errors.push('Missing code/page/test witness: '+row.id+':'+key);
 }
 if(row.acceptance!=='NOT_ACCEPTED'||row.verifiedByIndependentWitness!==false)errors.push('No method may claim acceptance from mere path existence: '+row.id);
}
if(matrix.disciplines.length!==21||ids.size!==21)errors.push('Phase-3 inventory changed without independent review');
console.log(JSON.stringify({total:matrix.disciplines.length,byPhase:Object.fromEntries([...allowedPhases].map(v=>[v,matrix.disciplines.filter(r=>r.phase===v).length])),errors},null,2));
if(errors.length)process.exitCode=1;
