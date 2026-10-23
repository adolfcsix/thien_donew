'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');

// Harness for shell orchestration only; this does not exercise PostgreSQL or HTTP.
for(const fail of [false,true])test('CI API and library tests share disposable private storage; cleanup on '+(fail?'failure':'success'),{skip:process.platform==='win32'},()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-ci-shell-'));
 try{
  const bin=path.join(temp,'bin');fs.mkdirSync(bin);const trace=path.join(temp,'trace.jsonl');
  fs.writeFileSync(path.join(bin,'node'),`#!${process.execPath}\nconst fs=require('node:fs');const file=process.argv.at(-1);const storage=process.env.BOOK_PRIVATE_STORAGE_DIR;if(file==='tests/v11155-books-http.test.mjs'){if(!storage||!fs.existsSync(storage)||!storage.includes('thiendo-ci-private-books'))process.exit(8);fs.writeFileSync(storage+'/fixture','test');fs.writeFileSync(process.env.CI_HARNESS_TRACE,JSON.stringify({storage}));if(process.env.CI_HARNESS_FAIL==='1')process.exit(9);}\n`,{mode:0o755});
  fs.writeFileSync(path.join(bin,'npm'),'#!/bin/sh\n'+`printf '%s' "$BOOK_PRIVATE_STORAGE_DIR" > "${temp}/server-storage"\nexec /bin/sleep 30\n`,{mode:0o755});
  const result=spawnSync('bash',['infrastructure/scripts/run-ci-http.sh'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,RUNNER_TEMP:temp,CI_HARNESS_TRACE:trace,CI_HARNESS_FAIL:fail?'1':'0',THIENDO_QIMEN_BROWSER:'0',THIENDO_BROWSER_ACCEPTANCE:'0'},encoding:'utf8',timeout:10000});
  assert.equal(result.error,undefined);assert.equal(result.status,fail?9:0,result.stderr);
  const record=JSON.parse(fs.readFileSync(trace,'utf8').trim());
  assert.equal(fs.readFileSync(path.join(temp,'server-storage'),'utf8').trim(),record.storage);
  assert.equal(fs.existsSync(record.storage),false,'private files removed after servers stop');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('day/star audit creates its output directory in a fresh checkout',{skip:process.platform==='win32'},()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-star-audit-'));
 try{
  const dir=path.join(temp,'infrastructure/scripts');fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(path.join(__dirname,'../infrastructure/scripts/audit-star-jie-witness-v111496.cjs'),path.join(dir,'audit.cjs'));
  fs.symlinkSync(path.join(__dirname,'../packages'),path.join(temp,'packages'),'dir');
  const r=spawnSync(process.execPath,[path.join(dir,'audit.cjs'),'--write'],{encoding:'utf8',timeout:10000});
  assert.equal(r.status,0,r.stderr);
  const report=JSON.parse(fs.readFileSync(path.join(temp,'docs/reports/V11_149_6_JIE_AND_STARS_WITNESSES.json'),'utf8'));
  assert.equal(report.status,'SOURCE_EVIDENCE_PASS');assert.equal(report.calendar.verifiedMinuteInstants,0);assert.equal(report.stars.newlyApprovedNames,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
