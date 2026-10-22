/** Only run on ephemeral localhost CI PostgreSQL with migrations 001–025 applied. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const url=process.env.DATABASE_URL;
if(process.env.CI!=='true'||process.env.E2E_LOCAL_DB_CONFIRM!=='YES'||!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):5432\/thiendo_test$/.test(url||'')){
 throw Error('BLOCKED: forum PostgreSQL E2E requires isolated 127.0.0.1:5432/thiendo_test and CI flags');
}
const client=new pg.Client({connectionString:url});
await client.connect();
try{
 await client.query('BEGIN');
 try{
  const required=['forum_threads','forum_comments','forum_reactions','forum_bookmarks','forum_follows','forum_notifications','forum_action_limits','forum_reports','forum_appeals','forum_moderation_events','forum_suspensions','forum_tinh_van_ledger'];
  const schema=await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename=ANY($1)`,[required]);
  assert.deepEqual(schema.rows.map(x=>x.tablename).sort(),[...required].sort());
  const [author,reader,mod]=[randomUUID(),randomUUID(),randomUUID()];
  for(const id of [author,reader,mod])await client.query('INSERT INTO users(id,email,password_hash,salt) VALUES($1,$2,$3,$4)',[id,`forum-${id}@example.invalid`,'test-only','test-only']);
  const [privateThread,publicThread,comment]=[randomUUID(),randomUUID(),randomUUID()];
  for(const [id,visibility] of [[privateThread,'private'],[publicThread,'public']])await client.query(`INSERT INTO forum_threads(id,category_id,author_id,title,body,visibility) VALUES($1,'tu-vi',$2,$3,$4,$5)`,[id,author,'Lá số cần nghiên cứu','Cần đối chiếu trường phái và giờ an sao',visibility]);
  let rows=await client.query(`SELECT id FROM forum_threads WHERE state='visible' AND visibility='public' AND id=ANY($1::uuid[])`,[[privateThread,publicThread]]);
  assert.deepEqual(rows.rows.map(x=>x.id),[publicThread]);
  rows=await client.query(`SELECT id FROM forum_threads WHERE id=$1 AND (visibility='public' OR author_id=$2)`,[privateThread,reader]);assert.equal(rows.rowCount,0);
  await client.query('INSERT INTO forum_comments(id,thread_id,author_id,body) VALUES($1,$2,$3,$4)',[comment,publicThread,reader,'Tôi đã kiểm tra bảng sao và lịch pháp']);
  await client.query('INSERT INTO forum_reactions(user_id,comment_id,kind) VALUES($1,$2,$3)',[author,comment,'helpful']);
  await client.query('SAVEPOINT dup_reaction');await assert.rejects(client.query('INSERT INTO forum_reactions(user_id,comment_id,kind) VALUES($1,$2,$3)',[author,comment,'helpful']),/duplicate key|unique constraint/i);await client.query('ROLLBACK TO SAVEPOINT dup_reaction');
  await client.query('INSERT INTO forum_reactions(user_id,comment_id,kind) VALUES($1,$2,$3)',[mod,comment,'helpful']);
  await client.query('INSERT INTO forum_tinh_van_ledger(user_id,comment_id,event,points) VALUES($1,$2,$3,$4)',[reader,comment,'helpful',2]);
  await client.query('SAVEPOINT dup_award');await assert.rejects(client.query("INSERT INTO forum_tinh_van_ledger(user_id,comment_id,event,points) VALUES($1,$2,'helpful',2)",[reader,comment]),/duplicate key|unique constraint/i);await client.query('ROLLBACK TO SAVEPOINT dup_award');
  await client.query("INSERT INTO forum_tinh_van_ledger(user_id,comment_id,event,points) VALUES($1,$2,'reversal',-2)",[reader,comment]);
  await client.query("INSERT INTO forum_tinh_van_ledger(user_id,comment_id,event,points) VALUES($1,$2,'restoration',2)",[reader,comment]);
  rows=await client.query('SELECT SUM(points)::int AS score FROM forum_tinh_van_ledger WHERE comment_id=$1',[comment]);assert.equal(rows.rows[0].score,2);
  await client.query('INSERT INTO forum_reports(id,reporter_id,thread_id,reason) VALUES($1,$2,$3,$4)',[randomUUID(),reader,publicThread,'privacy']);
  await client.query('SAVEPOINT dup_report');await assert.rejects(client.query('INSERT INTO forum_reports(id,reporter_id,thread_id,reason) VALUES($1,$2,$3,$4)',[randomUUID(),reader,publicThread,'privacy']),/duplicate key|unique constraint/i);await client.query('ROLLBACK TO SAVEPOINT dup_report');
  await client.query('SAVEPOINT both_targets');await assert.rejects(client.query('INSERT INTO forum_appeals(id,user_id,thread_id,comment_id,reason) VALUES($1,$2,$3,$4,$5)',[randomUUID(),reader,publicThread,comment,'Nội dung bị ẩn sai']),/check constraint/i);await client.query('ROLLBACK TO SAVEPOINT both_targets');
  await client.query('INSERT INTO forum_moderation_events(actor_id,thread_id,affected_user,action,reason) VALUES($1,$2,$3,$4,$5)',[mod,publicThread,author,'hide','Nội dung cần được xác minh']);
  await client.query('INSERT INTO forum_suspensions(user_id,expires_at,reason,moderator_id) VALUES($1,NOW()+INTERVAL \'1 day\',$2,$3)',[reader,'Spam thử nghiệm',mod]);
  await client.query('INSERT INTO forum_notifications(id,user_id,actor_id,thread_id,kind,message) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),author,reader,publicThread,'reply','Thông báo thử nghiệm']);
  await client.query('DELETE FROM users WHERE id=$1',[reader]);
  rows=await client.query('SELECT id FROM forum_comments WHERE id=$1',[comment]);assert.equal(rows.rowCount,0,'Account deletion must not be blocked by forum FK constraints');
  console.log('PASS: DB schema 024–025, visibility predicate, partial uniqueness, appeal check, Tinh Văn reversibility, audit, account deletion');
 }finally{await client.query('ROLLBACK');}
}finally{await client.end();}
