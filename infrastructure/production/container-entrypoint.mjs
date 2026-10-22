import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const path=process.env.DB_PASSWORD_FILE;
if(!path)throw new Error('DB_PASSWORD_FILE is required');
const password=readFileSync(path,'utf8').trim();
if(password.length<24||/CHANGE|REPLACE|EXAMPLE/i.test(password))throw new Error('Database secret must be generated and at least 24 characters');
const user=process.env.DB_USER||'thiendo_app';
if(!/^[a-z_][a-z0-9_]{0,62}$/.test(user))throw new Error('Invalid DB_USER');
const env={...process.env};
for(const name of ['ADMIN_MFA_ENCRYPTION_KEY','AUTH_OTP_SECRET']){
 const file=env[name+'_FILE'];
 if(file){
  const value=readFileSync(file,'utf8').trim();
  if(env[name]&&env[name]!==value)throw new Error(`Conflicting ${name} sources`);
  env[name]=value;
 }
}
if(env.NODE_ENV==='production'&&user==='thiendo_app'){
 const mfa=env.ADMIN_MFA_ENCRYPTION_KEY||'';
 if(!/^[A-Za-z0-9+/]{43}=$/.test(mfa)||Buffer.from(mfa,'base64').length!==32||Buffer.from(mfa,'base64').toString('base64')!==mfa)throw new Error('Configure a 32-byte base64 ADMIN_MFA_ENCRYPTION_KEY');
 if((env.AUTH_OTP_SECRET||'').length<32)throw new Error('Configure AUTH_OTP_SECRET with at least 32 characters');
}
const url=new URL('postgresql://db:5432/thiendo');url.username=user;url.password=password;
const [command,...args]=process.argv.slice(2);
if(!command)throw new Error('Missing container command');
const child=spawn(command,args,{stdio:'inherit',env:{...env,DATABASE_URL:url.toString()}});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{console.error('Application command failed to start');process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
