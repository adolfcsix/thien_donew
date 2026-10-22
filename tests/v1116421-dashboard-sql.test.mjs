/** Isolated SQL fixtures only; never connects to an operator database. */
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Set THIENDO_SQL_TEST_MODULE; no silent skip');
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
const {dashboardSnapshot}=require('../apps/api/dist/modules/admin-insights/dashboard-snapshot.js');
const baseline=process.env.THIENDO_DASHBOARD_BASELINE_MODULE?require(process.env.THIENDO_DASHBOARD_BASELINE_MODULE).dashboardSnapshot:null;
let pg;const evidence=[];
before(async()=>{pg=await PGlite.create();for(const name of readdirSync('infrastructure/db').filter(f=>/^\d{3}.*sql$/.test(f)).sort())await pg.exec(readFileSync('infrastructure/db/'+name,'utf8'));});
after(async()=>{await pg?.close();if(process.env.THIENDO_QUERY_REPORT)writeFileSync(process.env.THIENDO_QUERY_REPORT,JSON.stringify({baselineCompared:Boolean(baseline),cases:evidence},null,2)+'\n');});
for(const days of [1,7,30])for(const tracking of [false,true])test(`${days} days, tracking=${tracking}: exact boundaries, revenue semantics and query budget`,async()=>{
 const rollback=Error('fixture rollback');
 await assert.rejects(pg.transaction(async tx=>{
  const start=new Date('2001-06-15T17:00:00.000Z'),end=new Date(start.getTime()+(days-1)*86400000+12345678),previousStart=new Date(2*start.getTime()-end.getTime());
  const times=[new Date(previousStart.getTime()-1),previousStart,new Date(start.getTime()-1),start,new Date(end.getTime()-1),end];
  for(const [i,time] of times.entries()){
   const id=(await tx.query("INSERT INTO users(id,email,password_hash,salt,created_at) VALUES(gen_random_uuid(),$1,'fixture','fixture',$2) RETURNING id",[`boundary${i}@example.invalid`,time])).rows[0].id;
   await tx.query("INSERT INTO billing_orders(id,user_id,plan_id,plan_name,amount_vnd,days,features,status,request_key,expires_at,created_at,paid_at) VALUES(gen_random_uuid(),$1,'pro30','Fixture',1000,30,'[]',$2,gen_random_uuid(),NOW()+INTERVAL '1 day',$3,$3)",[id,i===4?'refunded':'paid',time]);
   await tx.query("INSERT INTO charts(id,user_id,label,birth_date,hour,minute,calendar,gender,rule_set,created_at) VALUES(gen_random_uuid(),$1,'Fixture','2000-01-01',12,0,'solar','Nam','fixture',$2)",[id,time]);
   await tx.query("INSERT INTO forum_threads(id,author_id,category_id,title,body,state,created_at) VALUES(gen_random_uuid(),$1,'tu-vi','Fixture','Fixture',$2,$3)",[id,i===4?'hidden':'visible',time]);
   await tx.query("INSERT INTO ai_usage(id,user_id,model,status,reserved_microusd,created_at) VALUES(gen_random_uuid(),$1,'fixture','completed',0,$2),(gen_random_uuid(),$1,'fixture','failed',0,$2)",[id,time]);
   await tx.query('INSERT INTO web_page_views(event_id,created_at) VALUES(gen_random_uuid(),$1)',[time]);
  }
  // Non-paid orders with paid_at set must not inflate confirmed revenue.
  await tx.query("INSERT INTO billing_orders(id,user_id,plan_id,plan_name,amount_vnd,days,features,status,request_key,expires_at,created_at,paid_at) SELECT gen_random_uuid(),id,'pro30','Pending fixture',9000,30,'[]','pending',gen_random_uuid(),NOW()+INTERVAL '1 day',$1,$1 FROM users LIMIT 1",[start]);
  await tx.query('INSERT INTO web_analytics_state(id,started_at) VALUES(1,$1)',[previousStart]);
  async function run(fn){let queries=0;const client={query:async(sql,params)=>{queries++;if(sql.includes('AS start,'))return {rows:[{start,end}]};return tx.query(sql,params);}};return {data:await fn(client,days,tracking),queries};}
  const current=await run(dashboardSnapshot);const metrics=Object.fromEntries(current.data.metrics.map(m=>[m.id,m]));
  assert.equal(metrics['users.new'].value,2);assert.equal(metrics['users.new'].previous,2);
  for(const id of ['charts.saved','forum.new','ai.completed']){assert.equal(metrics[id].value,2);assert.equal(metrics[id].previous,2);}
  assert.equal(metrics['orders.new'].value,3);assert.equal(metrics['orders.new'].previous,2);
  assert.equal(metrics['revenue.gross'].value,2000);assert.equal(metrics['revenue.gross'].previous,2000);
  assert.equal(metrics['orders.pending'].value,1);assert.equal(metrics['orders.pending'].previous,null);
  assert.equal(metrics['traffic.views'].value,tracking?2:null);assert.equal(metrics['traffic.views'].previous,tracking?2:null);
  assert.equal(current.data.daily.length,days);assert.equal(current.data.daily.reduce((sum,d)=>sum+d.registrations,0),2);
  assert.equal(current.queries,tracking?17:16);
  let previous=null;if(baseline){previous=await run(baseline);assert.deepEqual(current.data,previous.data);assert.equal(previous.queries,tracking?24:22);}
  evidence.push({days,tracking,beforeQueries:previous?.queries??null,afterQueries:current.queries,identicalOutput:previous?true:null});
  throw rollback;
 }),e=>e===rollback);
});
