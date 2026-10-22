import {readFileSync,statSync,lstatSync} from 'node:fs';
import {resolve,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const file=process.argv[2];
if(!file)throw new Error('Provide absolute path to the private .env.production file');
if(!isAbsolute(file))throw new Error('Use an absolute production environment path');
const path=resolve(file),text=readFileSync(path,'utf8');
if(process.platform!=='win32'&&(statSync(path).mode&0o077))throw new Error('Production environment file must be chmod 600');
const config={};
for(const line of text.split(/\r?\n/)){if(!line.trim()||line.trimStart().startsWith('#'))continue;const i=line.indexOf('=');if(i<1)throw Error('Invalid environment line');config[line.slice(0,i).trim()]=line.slice(i+1).trim();}
const release=process.argv[3];
if(release){for(const line of readFileSync(resolve(release),'utf8').split(/\r?\n/)){if(!line.trim()||line.startsWith('#'))continue;const i=line.indexOf('=');const key=line.slice(0,i);if(!['API_IMAGE','WEB_IMAGE'].includes(key))throw Error('Release file may only override API_IMAGE and WEB_IMAGE');config[key]=line.slice(i+1).trim();}}
const domain=config.THIEN_DO_DOMAIN||'';
if(!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)||/\.(example|invalid|localhost|test)$/.test(domain)||/replace|change/i.test(domain))throw Error('Set an actual registered domain');
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.ACME_EMAIL||'')||/example|invalid|replace/i.test(config.ACME_EMAIL))throw Error('Set a real ACME contact email');
for(const key of ['API_IMAGE','WEB_IMAGE','POSTGRES_IMAGE','CADDY_IMAGE','NGINX_IMAGE'])if(!/^[a-z0-9./_:-]+@sha256:[a-f0-9]{64}$/.test(config[key]||''))throw Error(`${key} must use a tested immutable sha256 digest`);
const secretDir=resolve(dirname(path),'secrets');
if(!lstatSync(secretDir).isDirectory()||lstatSync(secretDir).isSymbolicLink())throw Error('Secret directory must not be a link');
if((statSync(secretDir).mode&0o077)!==0)throw Error('Secret directory must be chmod 700');
const secretValues=[];
for(const name of ['db_owner_password','db_app_password','admin_mfa_encryption_key','auth_otp_secret']){
 const p=resolve(dirname(path),'secrets',name),st=lstatSync(p),value=readFileSync(p,'utf8').trim();
 if(!st.isFile()||st.isSymbolicLink())throw Error('Secrets must be regular files, not links');
 if((st.mode&0o777)!==0o444)throw Error('Compose file secrets must be read-only 444 inside the private 700 directory');
 secretValues.push(value);
 if(value.length<24||/replace|change|example/i.test(value))throw Error('Generate database secrets with at least 24 characters');
 if(name==='admin_mfa_encryption_key'&&(!/^[A-Za-z0-9+/]{43}=$/.test(value)||Buffer.from(value,'base64').length!==32||Buffer.from(value,'base64').toString('base64')!==value))throw Error('MFA key must encode exactly 32 random bytes in canonical base64');
 if(name==='auth_otp_secret'&&value.length<32)throw Error('AUTH_OTP_SECRET must have at least 32 characters');
}
if(new Set(secretValues).size!==secretValues.length)throw Error('Use distinct owner and application DB passwords and authentication secrets');
if(config.GOOGLE_CLIENT_ID&&(!/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(config.GOOGLE_CLIENT_ID)||!config.RESEND_API_KEY||!config.AUTH_EMAIL_FROM))throw Error('Google login requires a valid Web Client ID and full email configuration');
if(config.RESEND_API_KEY&&!config.AUTH_EMAIL_FROM)throw Error('Email provider requires AUTH_EMAIL_FROM');
const payos=['PAYOS_CLIENT_ID','PAYOS_API_KEY','PAYOS_CHECKSUM_KEY'].filter(key=>config[key]);
if(payos.length&&payos.length!==3)throw Error('Configure all three payOS credentials together');
console.log(JSON.stringify({status:'CONFIG_PASS',domain,scope:'local syntax/secret permissions; does not verify DNS, certificate, registry images or runtime'}));
