/** Server-rendered routes only. Does not claim browser hydration, layout or database acceptance. */
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(readFileSync(resolve(root,'apps/web/.next/prerender-manifest.json'),'utf8'));
const routes=Object.keys(manifest.routes).filter(p=>!p.startsWith('/_')).sort();
if(routes.length<20)throw Error('Missing expected application routes');
const port=await new Promise((yes,no)=>{const s=createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>yes(port));});});
const child=spawn(process.execPath,[resolve(root,'apps/web/.next/standalone/apps/web/server.js')],{cwd:root,env:{...process.env,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:String(port),NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore'});
const base='http://127.0.0.1:'+port,checks=[];
try {
 let ready=false;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw Error('Standalone process exited');
  try{const r=await fetch(base,{signal:AbortSignal.timeout(500)});await r.arrayBuffer();if(r.ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 if(!ready)throw Error('Standalone readiness timeout');
 for(const path of [...routes,'/__thiendo_missing_route_141__']){
  const r=await fetch(base+path,{redirect:'error',signal:AbortSignal.timeout(15000)}),html=await r.text();
  const expected=path.startsWith('/__thiendo_')?404:200;
  // Metadata route handlers (e.g. icon.svg) are not HTML pages.
  // Keep every route in coverage, checking its declared build content type.
  const route=manifest.routes[path];
  const declaredType=route?.routeType==='route' ? route.initialHeaders?.['content-type']?.split(';')[0] : 'text/html';
  const contentType=r.headers.get('content-type')?.split(';')[0];
  const bodyValid=declaredType==='text/html' ? html.includes('lang="vi"')&&!html.includes('Application error: a server-side exception') : html.length>0;
  const ok=r.status===expected&&Boolean(declaredType)&&contentType===declaredType&&bodyValid&&!!r.headers.get('x-content-type-options');
  checks.push({path,status:r.status,expected,contentType,declaredType,pass:!!ok});
 }
 const report={status:checks.every(c=>c.pass)?'PASS':'FAIL',routeCount:routes.length,checks,scope:'Built standalone HTTP/SSR only; no browser hydration, visual/responsive, OAuth, PostgreSQL or system load validation'};
 if(process.env.THIENDO_ROUTE_REPORT)writeFileSync(process.env.THIENDO_ROUTE_REPORT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1;
}finally{
 child.kill('SIGTERM');
 await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve();},3000).unref();});
}
