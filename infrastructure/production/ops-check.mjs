import {connect} from 'node:tls';
import {readFileSync} from 'node:fs';
const origin=process.env.PUBLIC_ORIGIN;
if(!origin)throw Error('PUBLIC_ORIGIN is required');
const u=new URL(origin);
if(u.protocol!=='https:'||u.pathname!=='/'||u.username||u.password)throw Error('Use an HTTPS origin');
const findings=[];
try {
 const redirected=await fetch('http://'+u.host+'/',{redirect:'manual',signal:AbortSignal.timeout(10000)});
 findings.push({check:'https_redirect',ok:[301,302,307,308].includes(redirected.status)&&new URL(redirected.headers.get('location')||'',u).origin===u.origin});
 for(const path of ['/','/api/health/ready']){
  const r=await fetch(new URL(path,u),{redirect:'error',signal:AbortSignal.timeout(15000)});await r.arrayBuffer();
  findings.push({check:path,ok:r.ok,status:r.status});
  for(const name of ['strict-transport-security','x-content-type-options','x-frame-options'])findings.push({check:path+':'+name,ok:!!r.headers.get(name)});
 }
 const days=await new Promise((resolve,reject)=>{const socket=connect({host:u.hostname,port:Number(u.port||443),servername:u.hostname,rejectUnauthorized:true},()=>{const cert=socket.getPeerCertificate();socket.end();resolve((Date.parse(cert.valid_to)-Date.now())/86400000);});socket.setTimeout(10000,()=>socket.destroy(Error('TLS timeout')));socket.on('error',reject);});
 findings.push({check:'certificate_remaining_days',ok:days>=14,days:Math.floor(days)});
}catch{findings.push({check:'network_or_tls',ok:false});}
for(const [key,hours] of [['BACKUP_STATUS_FILE',26],['RESTORE_DRILL_STATUS_FILE',31*24]]){
 const path=process.env[key];
 if(!path){findings.push({check:key,ok:false,reason:'status-file-not-configured'});continue;}
 try{const v=JSON.parse(readFileSync(path,'utf8')),age=(Date.now()-Date.parse(v.time))/3600000;const base=v.ok===true&&Number.isFinite(age)&&age>=0&&age<hours;
  const restore=key==='RESTORE_DRILL_STATUS_FILE';
  const proof=restore ? (v.productionChanged===false&&v.clearedAuthState===true&&v.minMigration>=19&&v.verifiedMigrationNames>=36
    &&typeof v.snapshot==='string'&&/^[a-f0-9]{8,64}$/.test(v.snapshot)
    &&typeof v.target==='string'&&/^thiendo_restore_[a-z0-9_]{1,32}$/.test(v.target)
    &&v.verifiedPrivateAssets===true&&Number.isSafeInteger(v.assetFiles)&&v.assetFiles>=0&&v.verifiedAssetReferences===true&&Number.isSafeInteger(v.assetReferences)&&v.assetReferences>=0)
    : v.includesPrivateAssets===true&&v.verifiedAssetReferences===true&&Number.isSafeInteger(v.assetReferences)&&v.assetReferences>=0&&typeof v.snapshot==='string'&&/^[a-f0-9]{8,64}$/.test(v.snapshot);
  findings.push({check:key,ok:base&&proof,reason:!proof?(restore?'restore-drill-provenance-incomplete':'backup-provenance-incomplete'):undefined});}catch{findings.push({check:key,ok:false});}
}
const ok=findings.every(x=>x.ok);
console.log(JSON.stringify({event:'production_probe',time:new Date().toISOString(),ok,findings}));
if(!ok)process.exitCode=1;
