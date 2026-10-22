/** V11.164 disaster recovery proof against a brand-new, isolated CI database. */
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
import {assertSafeE2ETarget} from './e2e-guard.mjs';
if(process.env.CI!=='true')throw Error('CI only: a restore test must not run on production');
const target=assertSafeE2ETarget();
if(target.databaseName!=='thiendo_test')throw Error('Only a dedicated thiendo_test source is allowed');
const original=new URL(process.env.DATABASE_URL);
const restoredURL=new URL(process.env.DATABASE_URL);
const name='thiendo_restore_'+randomBytes(6).toString('hex');
restoredURL.pathname='/'+name;
const postgresURL=new URL(original);postgresURL.pathname='/postgres';
const folder=mkdtempSync(join(tmpdir(),'thiendo-v11164-'));
const dump=join(folder,'backup.dump');
function exec(bin,args){const run=spawnSync(bin,args,{encoding:'utf8',timeout:120000,maxBuffer:128*1024});if(run.error||run.status!==0)throw Error(`${bin} failed: ${String(run.stderr||run.error?.message).slice(0,360)}`);}
const root=new pg.Client({connectionString:postgresURL.toString(),connectionTimeoutMillis:8000});
let connected=false,created=false;
try{
 exec('pg_dump',['--format=custom','--file',dump,original.toString()]);
 await root.connect();connected=true;
 await root.query('CREATE DATABASE '+name);created=true;
 exec('pg_restore',['--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',restoredURL.toString(),dump]);
 const a=new pg.Client({connectionString:original.toString(),connectionTimeoutMillis:8000});
 const b=new pg.Client({connectionString:restoredURL.toString(),connectionTimeoutMillis:8000});
 await a.connect();await b.connect();
 try{
  const query=async(client,sql)=>(await client.query(sql)).rows;
  const ledger=await query(a,'SELECT name FROM schema_migrations ORDER BY name');
  const clone=await query(b,'SELECT name FROM schema_migrations ORDER BY name');
  if(ledger.length!==29||JSON.stringify(ledger)!==JSON.stringify(clone))throw Error('Restored migration set incorrect');
  for(const table of ['users','charts','billing_orders','forum_threads','library_books','portal_documents']){
   const sql=`SELECT count(*)::int AS n FROM ${table}`;
   const originalCount=(await query(a,sql))[0].n;
   const recoveredCount=(await query(b,sql))[0].n;
   if(originalCount!==recoveredCount)throw Error('Restored table mismatch: '+table);
  }
  // The deploy restore-drill implementation invalidates all restored sessions/OTP secrets.
  // Exercise the same rule on the isolated replica; never issue a TRUNCATE against source.
  await b.query('BEGIN');
  await b.query('TRUNCATE sessions,admin_session_assurance,admin_mfa_credentials,account_email_verifications,account_security_events,auth_email_challenges,password_reset_challenges,auth_google_nonces');
  for(const table of ['sessions','admin_session_assurance','admin_mfa_credentials','account_email_verifications','account_security_events','auth_email_challenges','password_reset_challenges','auth_google_nonces']){
   const n=(await query(b,`SELECT count(*)::int AS n FROM ${table}`))[0].n;
   if(n!==0)throw Error('Restored volatile auth material not purged: '+table);
  }
  await b.query('COMMIT');
  console.log('PASS: disposable pg_dump/pg_restore; 29 migrations, business row counts and auth-secret purge');
 }finally{await a.end();await b.end();}
}finally{
 if(created&&connected){try{await root.query('DROP DATABASE '+name+' WITH (FORCE)');}catch(error){console.error('CRITICAL: failed to clean isolated restore',name,error.message);process.exitCode=1;}}
 if(connected)await root.end().catch(()=>{});
 rmSync(folder,{recursive:true,force:true});
}
