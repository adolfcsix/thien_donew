/** Preview by default; aggregate navigation UUIDs only, fixed 90-day retention. */
import pg from 'pg';
const url=process.env.DATABASE_URL;
if(!url)throw Error('DATABASE_URL required; no default database');
if(!['postgres:','postgresql:'].includes(new URL(url).protocol))throw Error('PostgreSQL required');
const pool=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,statement_timeout:10000});
try {
 const apply=process.argv.includes('--apply');
 // Bounded batch, schedule repeatedly if a large backlog exists.
 const sql=apply?`DELETE FROM web_page_views WHERE event_id IN (
   SELECT event_id FROM web_page_views WHERE created_at<clock_timestamp()-INTERVAL '90 days' ORDER BY created_at LIMIT 10000
 ) RETURNING event_id`:`SELECT COUNT(*)::text AS eligible FROM web_page_views WHERE created_at<clock_timestamp()-INTERVAL '90 days'`;
 const result=await pool.query(sql);
 console.log(JSON.stringify(apply?{mode:'APPLY',deleted:result.rowCount,maxBatch:10000}:{mode:'PREVIEW',eligible:result.rows[0].eligible}));
}finally{await pool.end();}
