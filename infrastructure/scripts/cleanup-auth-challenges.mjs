/** Dry-run by default. For a scheduled maintenance job, use `--apply` after
 * operator confirms the database target. Retain >=48h to preserve 24h rate limits. */
import pg from 'pg';
const url=process.env.DATABASE_URL;
if(!url)throw new Error('DATABASE_URL is required. Refusing to use a default database.');
const parsed=new URL(url);
if(!['postgres:','postgresql:'].includes(parsed.protocol))throw Error('PostgreSQL DATABASE_URL required');
const apply=process.argv.includes('--apply');
const pool=new pg.Pool({connectionString:url,connectionTimeoutMillis:5000,statement_timeout:10000,max:1});
try {
 const result=await pool.query(`SELECT
 (SELECT COUNT(*)::int FROM auth_email_challenges WHERE created_at < NOW()-INTERVAL '48 hours') AS google,
 (SELECT COUNT(*)::int FROM password_reset_challenges WHERE created_at < NOW()-INTERVAL '48 hours') AS passwords,
 (SELECT COUNT(*)::int FROM auth_google_nonces WHERE expires_at < clock_timestamp()) AS nonces`);
 console.log(JSON.stringify({action:apply?'APPLY':'DRY_RUN',eligible:result.rows[0]}));
 if(apply){
   const client=await pool.connect();
   try{await client.query('BEGIN');
    const a=await client.query("DELETE FROM auth_email_challenges WHERE created_at < NOW()-INTERVAL '48 hours'");
    const b=await client.query("DELETE FROM password_reset_challenges WHERE created_at < NOW()-INTERVAL '48 hours'");
    const c=await client.query('DELETE FROM auth_google_nonces WHERE expires_at < clock_timestamp()');
    await client.query('COMMIT');console.log(JSON.stringify({deleted:{google:a.rowCount,passwords:b.rowCount,nonces:c.rowCount}}));
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
}finally{await pool.end()}
