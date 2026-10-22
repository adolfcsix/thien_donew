/**
 * Loads optional repository-root .env for local development then invokes npm.
 * The environment is inherited by workspace processes (API and Next.js).
 * Existing OS variables, e.g. production secrets, take precedence over .env.
 */
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const dotenv=resolve(root,'.env');
if(existsSync(dotenv))loadEnvFile(dotenv);
const args=process.argv.slice(2);
if(args[0]!=='npm' || args.length<2)throw Error('Usage: node with-env.mjs npm run <script>');
const command=process.platform==='win32'?'npm.cmd':'npm';
const child=spawn(command,args.slice(1),{cwd:root,env:process.env,stdio:'inherit',shell:process.platform==='win32'});
child.on('error',error=>{console.error('npm command failed to start:',error.message);process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(!child.killed)child.kill(signal);});
