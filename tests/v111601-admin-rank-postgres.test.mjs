/** Disposable-only SQL regression for two independent Admin rank awards. Never connect to production. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const url=process.env.DATABASE_URL;
if(process.env.CI!=='true'||process.env.E2E_LOCAL_DB_CONFIRM!=='YES'||!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):5432\/thiendo_test$/.test(url||'')){
 throw Error('BLOCKED: V11.160.1 PostgreSQL E2E requires local disposable thiendo_test DB');
}
const c=new pg.Client({connectionString:url,connectionTimeoutMillis:7000});
await c.connect();
try{
 await c.query('BEGIN');
 try{
  const [member,adminOne,adminTwo]=[randomUUID(),randomUUID(),randomUUID()];
  for(const uuid of [member,adminOne,adminTwo])await c.query('INSERT INTO users(id,email,password_hash,salt) VALUES($1,$2,$3,$4)',[uuid,`manual-rank-${uuid}@example.invalid`,'test-only','test-only']);
  const first=await c.query('INSERT INTO tinh_canh_rank_grants(user_id,actor_id,level,reason) VALUES($1,$2,18,$3) RETURNING id',[member,adminOne,'Cấp biểu trưng sau khi xét hồ sơ minh chứng độc lập']);
  assert.equal(first.rowCount,1);
  const n=first.rows[0].id;
  await c.query('SAVEPOINT invalidlevel');
  await assert.rejects(c.query('INSERT INTO tinh_canh_rank_grants(user_id,actor_id,level,reason) VALUES($1,$2,19,$3)',[member,adminOne,'Thử nghiệm từ chối cảnh giới không tồn tại']),/check constraint/i);
  await c.query('ROLLBACK TO SAVEPOINT invalidlevel');
  await c.query('SAVEPOINT selfgrant');
  await assert.rejects(c.query('INSERT INTO tinh_canh_rank_grants(user_id,actor_id,level,reason) VALUES($1,$1,3,$2)',[adminOne,'Không chấp nhận Admin tự cấp huy chương']),/check constraint/i);
  await c.query('ROLLBACK TO SAVEPOINT selfgrant');
  await c.query('SAVEPOINT shortreason');
  await assert.rejects(c.query('INSERT INTO tinh_canh_rank_grants(user_id,actor_id,level,reason) VALUES($1,$2,5,$3)',[member,adminTwo,'ngắn']),/check constraint/i);
  await c.query('ROLLBACK TO SAVEPOINT shortreason');
  await c.query('SAVEPOINT cannotupdate');
  await assert.rejects(c.query('UPDATE tinh_canh_rank_grants SET level=3 WHERE id=$1',[n]),/append_only/i);
  await c.query('ROLLBACK TO SAVEPOINT cannotupdate');
  const before=await c.query('SELECT count(*)::integer AS n FROM tinh_van_awards WHERE user_id=$1',[member]);
  assert.equal(before.rows[0].n,0,'Administrative rank is separate from earned points');
  await c.query('INSERT INTO tinh_canh_rank_revocations(grant_id,actor_id,reason) VALUES($1,$2,$3)',[n,adminTwo,'Đã thay đổi huy chương theo quyết định của quản trị viên thứ hai']);
  const second=await c.query('INSERT INTO tinh_canh_rank_grants(user_id,actor_id,level,reason) VALUES($1,$2,8,$3) RETURNING id',[member,adminTwo,'Cấp mới cảnh giới Thông Huyền sau xét duyệt']);
  const active=await c.query(`SELECT level FROM tinh_canh_rank_grants g LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id WHERE g.user_id=$1 AND r.id IS NULL ORDER BY g.id DESC LIMIT 1`,[member]);
  assert.equal(active.rows[0].level,8);
  await c.query('SAVEPOINT duplicate_revoke');
  await assert.rejects(c.query('INSERT INTO tinh_canh_rank_revocations(grant_id,actor_id,reason) VALUES($1,$2,$3)',[n,adminOne,'Không cho thu hồi lại lần thứ hai']),/unique/i);
  await c.query('ROLLBACK TO SAVEPOINT duplicate_revoke');
  await c.query('DELETE FROM users WHERE id=$1',[member]);
  const cleared=await c.query('SELECT id FROM tinh_canh_rank_grants WHERE user_id=$1',[member]);
  assert.equal(cleared.rowCount,0);
  assert.ok(second.rows[0].id);
  console.log('PASS: PostgreSQL rank 1-18 bounds, no self-grant, immutability, two-Admin history, point isolation, no resurrection and account deletion');
 }finally{await c.query('ROLLBACK');}
}finally{await c.end();}
