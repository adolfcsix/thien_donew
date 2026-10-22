/** Run compiled code on loopback without Next/Nest watchers. Never a public deployment command. */
import {existsSync,readFileSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');

export function localBuiltPlan(root,env){
 if(env.NODE_ENV==='production')throw Error('start:local chỉ chạy local. Dùng quy trình production riêng với HTTPS.');
 if(!env.DATABASE_URL)throw Error('Thiếu DATABASE_URL trong .env. Khởi động Docker/DB và cấu hình local trước.');
 let db;try{db=new URL(env.DATABASE_URL);}catch{throw Error('DATABASE_URL không hợp lệ.');}
 if(!['postgres:','postgresql:'].includes(db.protocol)||!['localhost','127.0.0.1','[::1]'].includes(db.hostname))throw Error('start:local chỉ dùng PostgreSQL local; không dùng database từ xa.');
 const origin=(env.WEB_ORIGIN||'http://localhost:3000').replace(/\/$/,'');
 if(!['http://localhost:3000','http://127.0.0.1:3000'].includes(origin))throw Error('WEB_ORIGIN cho start:local cần là http://localhost:3000 hoặc http://127.0.0.1:3000.');
 if(env.API_PORT&&env.API_PORT!=='8080')throw Error('start:local dùng API_PORT=8080 để khớp proxy đã build.');
 if(env.API_INTERNAL_URL&&env.API_INTERNAL_URL.replace(/\/$/,'')!=='http://127.0.0.1:8080')throw Error('API_INTERNAL_URL cần là http://127.0.0.1:8080. Build lại sau khi đổi proxy.');
 if(env.COOKIE_SECURE==='true')throw Error('HTTP local cần COOKIE_SECURE=false. Không sửa cấu hình HTTPS production để dùng local.');
 const api=resolve(root,'apps/api/dist/main.js'),web=resolve(root,'apps/web/.next/standalone/apps/web/server.js');
 for(const p of [api,web,resolve(dirname(web),'public/tarot/rws-1909/ar00.jpg'),resolve(dirname(web),'.next/static')])if(!existsSync(p))throw Error('Thiếu bản build hoặc tài nguyên. Chạy npm run build rồi npm run start:local.');
 let rewrites;try{rewrites=JSON.parse(readFileSync(resolve(dirname(web),'.next/routes-manifest.json'),'utf8')).rewrites;}catch{throw Error('Thiếu routes manifest. Chạy npm run build lại cho cấu hình local.');}
 const rules=Array.isArray(rewrites)?rewrites:Object.values(rewrites||{}).flat();
 const proxy=rules.filter(rule=>rule.source==='/api/:path*');
 if(proxy.length!==1||proxy[0].destination!=='http://127.0.0.1:8080/api/:path*')throw Error('Proxy trong bản build không khớp API local. Đặt API_INTERNAL_URL=http://127.0.0.1:8080 rồi chạy npm run build.');
 return [
  {name:'API',file:api,cwd:resolve(root,'apps/api'),env:{...env,NODE_ENV:'development',API_HOST:'127.0.0.1',API_PORT:'8080',WEB_ORIGIN:origin}},
  {name:'WEB',file:web,cwd:dirname(web),env:{...env,WEB_ORIGIN:origin,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:'3000'}},
 ];
}
export async function assertLocalPortFree(port){
 const probe=createServer();
 await new Promise((ok,fail)=>{probe.once('error',()=>fail(Error(`Cổng ${port} đang được dùng. Dừng cửa sổ npm run dev/start cũ trước; không cần xóa dữ liệu.`)));probe.listen(port,'127.0.0.1',ok);});
 await new Promise((ok,fail)=>probe.close(error=>error?fail(error):ok()));
}
/**
 * Start an already validated local process pair. Keeping this process lifecycle
 * independent of the fixed-port preflight makes it testable without taking
 * ownership of another application's ports (8080/3000).
 * This function does not bypass localBuiltPlan or assertLocalPortFree in main().
 */
export function startLocalBuiltChildren(plan,{stdio='inherit',logger=console,onExitCode=code=>{process.exitCode=code;},graceMs=3000}={}){
 const children=[];
 let stopping=false,requestedCode=null;
 let completed;
 const finished=new Promise(resolve=>{completed=resolve;});
 let remaining=plan.length;
 if(!remaining){completed(0);return {children,stop:()=>{},finished};}
 let killTimer;
 function stop(code){
  if(stopping)return;
  stopping=true;
  requestedCode=Number.isInteger(code)?code:1;
  onExitCode(requestedCode);
  for(const child of children)if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');
  killTimer=setTimeout(()=>{
   for(const child of children)if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
  },graceMs);
  killTimer.unref();
 }
 for(const item of plan){
  const child=spawn(process.execPath,[item.file],{cwd:item.cwd,env:item.env,stdio});
  children.push(child);
  child.once('error',()=>{logger.error(`${item.name} không khởi động được. Chạy npm run check:environment để chẩn đoán.`);stop(1);});
  child.once('exit',(code,signal)=>{
   if(!stopping){logger.error(`${item.name} đã dừng (${signal||code}); dừng tiến trình còn lại.`);stop(code || 1);}
  });
  child.once('close',()=>{
   if(--remaining===0){clearTimeout(killTimer);completed(requestedCode??1);}
  });
 }
 return {children,stop,finished};
}
async function main(){
 if(existsSync(resolve(ROOT,'.env')))loadEnvFile(resolve(ROOT,'.env'));
 const plan=localBuiltPlan(ROOT,process.env);
 for(const port of [8080,3000])await assertLocalPortFree(port);
 const pair=startLocalBuiltChildren(plan);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>pair.stop(0));
 console.log('THIÊN ĐỒ local đã build — không biên dịch lại từng trang. Chờ API/WEB báo sẵn sàng rồi mở '+plan[0].env.WEB_ORIGIN+'. Ctrl+C để dừng.');
 await pair.finished;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
