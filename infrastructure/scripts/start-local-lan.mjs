/** Explicit local development origin; never trusts browser Host/forwarded headers. */
import {networkInterfaces} from 'node:os';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {localLanEnvironment} from './lib/local-lan-origin.mjs';
const root=resolve(import.meta.dirname,'../..');
if(existsSync(resolve(root,'.env')))loadEnvFile(resolve(root,'.env'));
const env=localLanEnvironment(process.argv[2],networkInterfaces(),process.env),origin=env.WEB_ORIGIN;
console.log('Mở cùng địa chỉ này trên máy và điện thoại: '+origin);
console.log('API vẫn ở loopback; chỉ Next.js lắng nghe mạng LAN. Không tắt MFA hoặc bảo vệ nguồn yêu cầu.');
const child=spawn(process.execPath,[resolve(root,'node_modules/concurrently/dist/bin/concurrently.js'),'--kill-others','-n','API,WEB','npm run dev -w @thiendo/api','npm run dev -w @thiendo/web -- --hostname 0.0.0.0'],{cwd:root,env,stdio:'inherit'});
child.on('error',e=>{console.error(e.message);process.exitCode=1});child.on('exit',(code)=>{process.exitCode=code??1});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(!child.killed)child.kill(signal)});
