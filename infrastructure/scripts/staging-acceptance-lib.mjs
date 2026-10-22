/** V11.149. Evidence review only: local JSON is not independently authenticated CI/host proof. */
import {createHash} from 'node:crypto';

export const REQUIRED = Object.freeze([
  'npm_ci', 'typecheck', 'build', 'migrations', 'http_e2e',
  'chromium_responsive', 'oauth_otp', 'backup_restore',
  'tls_dns', 'monitoring_alerts', 'rollback', 'dependency_audit'
]);
const shaPattern = /^[0-9a-f]{40}$/i;
const resultStates = new Set(['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN']);
export const sha256Text = text => createHash('sha256').update(text).digest('hex');
function validUrl(text) {
 try {
  const u=new URL(text);
  return u.protocol==='https:' && !u.username && !u.password && !/\.invalid$|localhost$|\.local$/i.test(u.hostname)
    && !u.hash && !u.search;
 } catch {return false;}
}
export function evaluateStagingEvidence(record,{version,sha,now=Date.now()}={}) {
 const problems=[];
 if(!record||typeof record!=='object'||Array.isArray(record))return {status:'NO_GO',problems:['evidence:invalid-object'],missing:[...REQUIRED]};
 if(record.schema!==1) problems.push('schema:unknown');
 if(record.version!==version) problems.push('version:mismatch');
 if(!shaPattern.test(record.commit||'')||!shaPattern.test(sha||'')||record.commit.toLowerCase()!==sha.toLowerCase())
  problems.push('commit:missing-or-mismatch');
 const date=Date.parse(record.completedAt||''), age=now-date;
 if(!Number.isFinite(date)||age<0||age>24*3600*1000)problems.push('evidence:stale-or-future');
 if(record.environment!=='staging') problems.push('environment:not-staging');
 if(!validUrl(record.origin))problems.push('origin:invalid-https-origin');
 if(!Array.isArray(record.checks))problems.push('checks:invalid');
 const checks=Array.isArray(record.checks)?record.checks:[];
 const unique=new Set(),byId=new Map();
 for(const x of checks){
  if(!x||typeof x.id!=='string'||unique.has(x.id)){problems.push('checks:duplicate-or-invalid-id');continue;}
  unique.add(x.id);byId.set(x.id,x);
  if(!resultStates.has(x.status))problems.push(`checks:invalid-status:${x.id}`);
  if(x.status==='PASS'&&(!validUrl(x.runUrl)||typeof x.evidenceSha256!=='string'||!/^[a-f0-9]{64}$/i.test(x.evidenceSha256)))
   problems.push(`checks:missing-proof:${x.id}`);
 }
 const missing=REQUIRED.filter(id=>byId.get(id)?.status!=='PASS');
 if(missing.length)problems.push('required-gates:incomplete');
 // A hand-authored receipt could pass structural review, but never prove remote workflow execution.
 return {status:problems.length?'NO_GO':'EVIDENCE_STRUCTURALLY_COMPLETE_UNVERIFIED',problems,missing,
  caution:'Run IDs, SHA-256 and receipts need independent verification in GitHub Actions and staging. This local report never authorizes publication.'};
}
