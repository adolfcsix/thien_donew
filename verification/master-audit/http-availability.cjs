'use strict';
const fs=require('fs'),{spawn}=require('child_process');
(async()=>{
 const log=fs.openSync('verification/master-audit/http-availability-server.log','w');
 const server=spawn(process.execPath,['apps/web/.next/standalone/apps/web/server.js'],{cwd:process.cwd(),env:{...process.env,HOSTNAME:'127.0.0.1',PORT:'3107'},stdio:['ignore',log,log]});
 const results=[];let ready=false;
 try{
  for(let i=0;i<60;i++){
   if(server.exitCode!==null)break;
   try{const r=await fetch('http://127.0.0.1:3107/',{signal:AbortSignal.timeout(1000)});await r.arrayBuffer();if(r.status<400){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  const routes=JSON.parse(fs.readFileSync('docs/current/function-inventory.json')).routes;
  for(const row of routes){
   if(row.route.includes('[')){results.push({route:row.route,status:'NOT TESTED',reason:'Dynamic fixture needed'});continue;}
   if(!ready){results.push({route:row.route,status:'BLOCKED',reason:'Next.js did not start; see server log'});continue;}
   try{const r=await fetch('http://127.0.0.1:3107'+row.route,{redirect:'manual',signal:AbortSignal.timeout(15000)}),body=await r.text();results.push({route:row.route,status:r.status<400?'PASS':'FAIL',httpStatus:r.status,location:r.headers.get('location'),html:r.headers.get('content-type')?.includes('text/html'),bytes:body.length});}
   catch(e){results.push({route:row.route,status:'BLOCKED',reason:e.message});}
  }
 }finally{
  if(server.exitCode===null){server.kill('SIGTERM');await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);if(server.exitCode===null)server.kill('SIGKILL');}
  fs.closeSync(log);
 }
 const counts=results.reduce((o,r)=>(o[r.status]=(o[r.status]||0)+1,o),{});
 fs.writeFileSync('verification/master-audit/http-availability.json',JSON.stringify({createdUTC:new Date().toISOString(),scope:'Packaged standalone guest HTTP availability only; no backend/database or browser JS execution. Not proof of authorization, final content, interactions, accessibility or visual quality.',counts,results},null,2));
 console.log(JSON.stringify(counts));if(counts.FAIL||counts.BLOCKED)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
