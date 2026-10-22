/** Safe, one-shot explicit provisioning; NEVER contains passwords or seed users. */
import pg from 'pg';
const args=process.argv;
function flag(name){const i=args.indexOf(name);return i<0?null:args[i+1];}
const first=flag('--quynhngan-email')?.trim().toLowerCase();
const second=flag('--mcuong-email')?.trim().toLowerCase();
if(!process.env.DATABASE_URL||!first||!second||first===second||![first,second].every(e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))throw Error('Provide explicit DATABASE_URL, --quynhngan-email, --mcuong-email (two distinct existing verified users)');
if(process.env.NODE_ENV==='production' && process.env.BOOTSTRAP_DUAL_ADMIN_CONFIRM!=='YES')throw Error('Production dual-owner bootstrap requires BOOTSTRAP_DUAL_ADMIN_CONFIRM=YES');
const db=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
await db.connect();
try{
 await db.query('BEGIN');
 await db.query('SELECT pg_advisory_xact_lock(20261014,13)');
 const result=await db.query(`SELECT id,email,username,email_verified_at,
 EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=u.id) AS blocked,
 (length(password_hash)=128) AS has_password
 FROM users u WHERE email=ANY($1::text[]) FOR UPDATE`,[[first,second]]);
 if(result.rows.length!==2)throw Error('Both owners must register separately and verify email first');
 const wanted=new Map([[first,'quynhngan297'],[second,'mcuong484']]);
 for(const row of result.rows){if(!row.email_verified_at||!row.has_password||row.blocked)throw Error('Both owners require verified emails, individual passwords and unblocked accounts');if(row.username && row.username!==wanted.get(row.email))throw Error('Existing username differs from intended admin identity');}
 const existing=await db.query("SELECT user_id FROM admin_memberships WHERE role='owner' FOR UPDATE");
 const allowed=new Set(result.rows.map(r=>r.id));
 if(existing.rows.some(r=>!allowed.has(r.user_id)))throw Error('Another owner already exists; explicit offline recovery required');
 for(const row of result.rows){
  const handle=wanted.get(row.email);
  const current=await db.query('SELECT id FROM users WHERE lower(username)=lower($1) AND id<>$2',[handle,row.id]);
  if(current.rows.length)throw Error('Owner username already assigned to another account');
  await db.query('UPDATE users SET username=$1 WHERE id=$2',[handle,row.id]);
  await db.query(`INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner') ON CONFLICT(user_id) DO UPDATE SET role='owner'`,[row.id]);
  await db.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',[row.id,'owner.provision',handle,JSON.stringify({method:'offline-dual-provision'})]);
 }
 await db.query('COMMIT');
 console.log('PASS: two distinct owner identities provisioned; each must enroll their OWN MFA before accessing /api/admin.');
}catch(e){await db.query('ROLLBACK');console.error('BLOCKED:',e.message);process.exitCode=1;}finally{await db.end();}
