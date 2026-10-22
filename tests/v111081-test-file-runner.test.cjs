'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync,readdirSync}=require('node:fs');const {tmpdir}=require('node:os');const {join}=require('node:path');
const load=()=>import('../infrastructure/scripts/lib/test-file-runner.mjs');
function workspace(){return mkdtempSync(join(tmpdir(),'thiendo-runner-'));}
const tap='# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
test('Node 22.13 and modern Node use the supported isolation flag',async()=>{
 const {isolationFlag}=await load();assert.equal(isolationFlag('22.13.0'),'--experimental-test-isolation=none');assert.equal(isolationFlag('23.5.0'),'--experimental-test-isolation=none');assert.equal(isolationFlag('23.6.0'),'--test-isolation=none');assert.equal(isolationFlag('24.19.0'),'--test-isolation=none');assert.throws(()=>isolationFlag('22.12.0'),RangeError);
});
test('TAP summaries must be complete, unique and have no skip/todo/failure',async()=>{
 const {parseTap}=await load();assert.equal(parseTap(tap).valid,true);
 for(const invalid of ['',tap+tap,tap.replace('# pass 1','# pass 0'),tap.replace('# skipped 0','# skipped 1'),tap.replace('# todo 0','# todo 1'),tap.replace('# cancelled 0','# cancelled 1'),tap.replace('# tests 1','# tests 0')])assert.equal(parseTap(invalid).valid,false);
});
test('each file executes once and diagnostics include every named result',async()=>{
 const {runTestFiles}=await load();const cwd=workspace();try{
  for(const file of ['a.cjs','b.cjs'])writeFileSync(join(cwd,file),`process.stdout.write(${JSON.stringify(tap)});`);
  const report=await runTestFiles(['a.cjs','b.cjs'],{cwd,reportDir:join(cwd,'evidence'),timeoutMs:10000,runTimeoutMs:20000,log:()=>{},argsForFile:file=>[file]});
  assert.equal(report.verdict,'PASS');assert.equal(report.tests,2);assert.deepEqual(report.results.map(r=>r.file),['a.cjs','b.cjs']);
  const saved=JSON.parse(readFileSync(join(cwd,'evidence/results.json')));assert.equal(saved.results.length,2);assert.ok(readFileSync(saved.results[0].logFile,'utf8').includes('# tests 1'));
 }finally{rmSync(cwd,{recursive:true,force:true});}
});
test('timeout is a failure and later tests still receive their own result',async()=>{
 const {runTestFiles}=await load();const cwd=workspace();try{
  writeFileSync(join(cwd,'hang.cjs'),'setInterval(()=>{},1000);');writeFileSync(join(cwd,'pass.cjs'),`process.stdout.write(${JSON.stringify(tap)});`);
  const report=await runTestFiles(['hang.cjs','pass.cjs'],{cwd,reportDir:join(cwd,'evidence'),concurrency:1,timeoutMs:5000,runTimeoutMs:30000,log:()=>{},argsForFile:file=>[file]});
  assert.equal(report.verdict,'BLOCKED');assert.equal(report.results[0].timedOut,true);assert.equal(report.results[1].status,'PASS');
 }finally{rmSync(cwd,{recursive:true,force:true});}
});
test('nonzero exit and missing summaries cannot pass',async()=>{
 const {runTestFiles}=await load();const cwd=workspace();try{
  writeFileSync(join(cwd,'exit.cjs'),`process.stdout.write(${JSON.stringify(tap)});process.exitCode=1;`);writeFileSync(join(cwd,'empty.cjs'),'console.log("no summary");');
  const report=await runTestFiles(['exit.cjs','empty.cjs'],{cwd,reportDir:join(cwd,'evidence'),timeoutMs:10000,runTimeoutMs:20000,log:()=>{},argsForFile:file=>[file]});assert.equal(report.verdict,'FAIL');assert.ok(report.results.every(r=>r.status==='FAIL'));
 }finally{rmSync(cwd,{recursive:true,force:true});}
});
test('global deadline marks unexecuted files as blocked rather than silently skipped',async()=>{
 const {runTestFiles}=await load();const cwd=workspace();try{
  for(const f of ['a.cjs','b.cjs','c.cjs'])writeFileSync(join(cwd,f),'setInterval(()=>{},1000);');
  const report=await runTestFiles(['a.cjs','b.cjs','c.cjs'],{cwd,reportDir:join(cwd,'evidence'),concurrency:1,timeoutMs:1000,runTimeoutMs:1000,log:()=>{},argsForFile:file=>[file]});assert.equal(report.verdict,'BLOCKED');assert.equal(report.abortReason,'Overall test deadline exceeded');assert.equal(report.results.length,3);assert.ok(report.results.slice(1).every(r=>r.status==='BLOCKED'));
 }finally{rmSync(cwd,{recursive:true,force:true});}
});

test('subprocess-sensitive files have exclusive execution without losing coverage',async()=>{
 const {runTestFiles}=await load();const cwd=workspace();let active=0,exclusive=false;try{
  for(const f of ['a.cjs','exclusive.cjs','b.cjs'])writeFileSync(join(cwd,f),`setTimeout(()=>process.stdout.write(${JSON.stringify(tap)}),50);`);
  const report=await runTestFiles(['a.cjs','exclusive.cjs','b.cjs'],{cwd,reportDir:join(cwd,'evidence'),exclusiveFiles:['exclusive.cjs'],timeoutMs:10000,runTimeoutMs:30000,argsForFile:file=>[file],log:line=>{
   if(line.startsWith('START')){if(line.includes('exclusive.cjs')){assert.equal(active,0);exclusive=true;}else assert.equal(exclusive,false);active++;}
   else if(line.startsWith('PASS')||line.startsWith('FAIL')){active--;if(line.includes('exclusive.cjs'))exclusive=false;}
  }});assert.equal(report.verdict,'PASS');assert.equal(report.results.length,3);
 }finally{rmSync(cwd,{recursive:true,force:true});}
});
test('final results are published only after all files; partial progress cannot overwrite a completed verdict',async()=>{
 const {runTestFiles}=await load(),cwd=workspace(),reportDir=join(cwd,'evidence');
 try{
  require('node:fs').mkdirSync(reportDir);
  writeFileSync(join(reportDir,'results.json'),JSON.stringify({verdict:'PASS',tests:999}));
  for(const file of ['a.cjs','b.cjs'])writeFileSync(join(cwd,file),`process.stdout.write(${JSON.stringify(tap)});`);
  let inspected=false;
  const report=await runTestFiles(['a.cjs','b.cjs'],{cwd,reportDir,concurrency:1,timeoutMs:10000,runTimeoutMs:20000,argsForFile:file=>[file],log:line=>{
   if(line.startsWith('PASS a.cjs')){
    inspected=true;assert.equal(existsSync(join(reportDir,'results.json')),false);
    const progress=JSON.parse(readFileSync(join(reportDir,'progress.json')));assert.equal(progress.results.length,1);assert.equal(progress.verdict,undefined);
   }
  }});
  assert.equal(inspected,true);assert.equal(report.verdict,'PASS');
  const saved=JSON.parse(readFileSync(join(reportDir,'results.json')));assert.equal(saved.tests,2);assert.equal(saved.results.length,2);assert.equal(saved.verdict,'PASS');
  const previous=readdirSync(reportDir).find(name=>name.startsWith('previous-results-'));assert.ok(previous);assert.equal(JSON.parse(readFileSync(join(reportDir,previous))).tests,999);
 }finally{rmSync(cwd,{recursive:true,force:true});}
});
