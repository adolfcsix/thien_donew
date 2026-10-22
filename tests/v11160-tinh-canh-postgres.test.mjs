/** CI-only PostgreSQL schema and ledger regression, never runs against production.
 * Requires migrations 001..027 applied. Run after E2E target validation.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const url=process.env.DATABASE_URL;
if(process.env.CI!=='true'||process.env.E2E_LOCAL_DB_CONFIRM!=='YES'||!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):5432\/thiendo_test$/.test(url||'')){
 throw Error('BLOCKED: Thap Bat Tinh Canh PostgreSQL test requires disposable CI-only localhost database');
}
const db=new pg.Client({connectionString:url,connectionTimeoutMillis:7000});
await db.connect();
try{
 await db.query('BEGIN');
 try{
  const tables=['tinh_van_awards','tinh_van_reversals','tinh_van_rate_limits','tinh_canh_preferences'];
  const result=await db.query('SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename=ANY($2)', ['public',tables]);
  assert.deepEqual(result.rows.map(r=>r.tablename).sort(),tables.sort());
  const [member,reviewer,other]=[randomUUID(),randomUUID(),randomUUID()];
  for(const id of [member,reviewer,other])await db.query('INSERT INTO users(id,email,password_hash,salt) VALUES($1,$2,$3,$4)',[id,`tinh-canh-${id}@example.invalid`,'test-only','test-only']);
  const source=randomUUID();
  await db.query(`INSERT INTO tinh_van_awards(user_id,actor_id,kind,direction,subject,source_id,points) VALUES($1,$2,'learning-reviewed','hoc-gia','nghien-cuu',$3,8)`,[member,reviewer,source]);
  await db.query('SAVEPOINT duplicated');
  await assert.rejects(db.query(`INSERT INTO tinh_van_awards(user_id,actor_id,kind,direction,source_id,points) VALUES($1,$2,'exploration-reviewed','kham-pha-gia',$3,10)`,[member,reviewer,source]),/duplicate key|unique/i);
  await db.query('ROLLBACK TO SAVEPOINT duplicated');
  await db.query('SAVEPOINT forged');
  await assert.rejects(db.query(`INSERT INTO tinh_van_awards(user_id,actor_id,kind,direction,source_id,points) VALUES($1,$2,'learning-reviewed','hoc-gia',$3,49)`,[member,reviewer,randomUUID()]),/check constraint/i);
  await db.query('ROLLBACK TO SAVEPOINT forged');
  await db.query('SAVEPOINT tamper');
  await assert.rejects(db.query(`UPDATE tinh_van_awards SET points=30 WHERE user_id=$1`,[member]),/append_only|ledger_is_append_only/i);
  await db.query('ROLLBACK TO SAVEPOINT tamper');
  const a=await db.query('SELECT id FROM tinh_van_awards WHERE user_id=$1',[member]);
  await db.query('INSERT INTO tinh_van_reversals(award_id,actor_id,reason) VALUES($1,$2,$3)',[a.rows[0].id,reviewer,'Kiểm tra thu hồi có ghi lý do']);
  await db.query('SAVEPOINT reversed');
  await assert.rejects(db.query('INSERT INTO tinh_van_reversals(award_id,actor_id,reason) VALUES($1,$2,$3)',[a.rows[0].id,other,'Kiểm tra thu hồi lặp lại điểm']),/duplicate key|unique/i);
  await db.query('ROLLBACK TO SAVEPOINT reversed');
  let score=await db.query(`SELECT SUM(a.points)::integer AS score FROM tinh_van_awards a LEFT JOIN tinh_van_reversals r ON r.award_id=a.id WHERE a.user_id=$1 AND r.id IS NULL`,[member]);
  assert.equal(score.rows[0].score,null);
  await db.query('INSERT INTO tinh_canh_preferences(user_id,public_rank) VALUES($1,false)',[member]);
  // Deleting a member must not fail on the append-only ledger's FK chain.
  await db.query('DELETE FROM users WHERE id=$1',[member]);
  assert.equal((await db.query('SELECT id FROM tinh_van_awards WHERE user_id=$1',[member])).rowCount,0);
  assert.equal((await db.query('SELECT award_id FROM tinh_van_reversals WHERE award_id=$1',[a.rows[0].id])).rowCount,0);
  console.log('PASS: V11.159–160 SQL policy amounts, unique evidence, reversals, immutable points, GDPR-style account cleanup');
 }finally{await db.query('ROLLBACK');}
}finally{await db.end();}
