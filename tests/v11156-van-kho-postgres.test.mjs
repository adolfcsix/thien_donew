// Run ONLY with a disposable migration-complete PostgreSQL CI database.
import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const url=process.env.DATABASE_URL;
const accepted=/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):5432\/thiendo_test$/;
if(process.env.CI!=='true'||process.env.E2E_LOCAL_DB_CONFIRM!=='YES'||!url||!accepted.test(url))throw Error('BLOCKED: this test only runs on GitHub CI disposable localhost/ thiendo_test');
const db=new pg.Client({connectionString:url});
await db.connect();
try{
 await db.query('BEGIN');
 try{
  const expected=['van_kho_documents','van_kho_authors','van_kho_revisions','van_kho_review_events','van_kho_media'];
  const r=await db.query('SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename=ANY($2)', ['public',expected]);
  assert.deepEqual(r.rows.map(x=>x.tablename).sort(),expected.sort(),'Migrations 022–023 must exist');
  const actor1=randomUUID(),actor2=randomUUID(),doc=randomUUID(),author=randomUUID(),media=randomUUID(),key=randomUUID();
  for(const [id,email] of [[actor1,'vankho1-'+actor1+'@example.invalid'],[actor2,'vankho2-'+actor2+'@example.invalid']])await db.query('INSERT INTO users(id,email,password_hash,salt) VALUES($1,$2,$3,$4)',[id,email,'unit-test','unit-test']);
  await db.query('INSERT INTO van_kho_authors(id,name) VALUES($1,$2)',[author,'Người nghiên cứu']);
  await db.query('INSERT INTO van_kho_documents(id,slug,title,subject,author_id,created_by) VALUES($1,$2,$3,$4,$5,$6)',[doc,'kiem-toan-'+doc.slice(0,8),'Bài kiểm tra','tu-vi',author,actor1]);
  await db.query('INSERT INTO van_kho_revisions(doc_id,version,title,body,editor_id,subject) VALUES($1,$2,$3,$4,$5,$6)',[doc,1,'Bài kiểm tra',`![Sơ đồ](vk-image:${media})`,actor1,'tu-vi']);
  await db.query('INSERT INTO van_kho_media(id,doc_id,file_key,format,content_bytes,sha256,alt_text,rights_note,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[media,doc,key,'png',128,'0'.repeat(64),'Sơ đồ chứng cứ','Giấy phép thử nghiệm',actor1]);
  const publicSql=`SELECT d.id FROM van_kho_documents d WHERE d.slug=$1 AND (d.status='published' OR (d.status='scheduled' AND d.scheduled_at<=clock_timestamp()))`;
  let res=await db.query(publicSql,['kiem-toan-'+doc.slice(0,8)]);assert.equal(res.rowCount,0,'Draft hidden');
  await db.query('UPDATE van_kho_documents SET status=$2,scheduled_at=clock_timestamp()+interval \'1 hour\' WHERE id=$1',[doc,'scheduled']);
  res=await db.query(publicSql,['kiem-toan-'+doc.slice(0,8)]);assert.equal(res.rowCount,0,'Future-scheduled hidden');
  await db.query('UPDATE van_kho_documents SET scheduled_at=clock_timestamp()-interval \'1 minute\' WHERE id=$1',[doc]);
  res=await db.query(publicSql,['kiem-toan-'+doc.slice(0,8)]);assert.equal(res.rowCount,1,'Scheduled after time visible');
  await db.query('SAVEPOINT owner_reject');
  await assert.rejects(()=>db.query('UPDATE van_kho_media SET reviewed_by=$2,reviewed_at=NOW() WHERE id=$1',[media,actor1]),/check constraint/i,'Same uploader cannot self-review');
  await db.query('ROLLBACK TO SAVEPOINT owner_reject');
  await db.query('UPDATE van_kho_media SET reviewed_by=$2,reviewed_at=NOW() WHERE id=$1',[media,actor2]);
  res=await db.query('SELECT uploaded_by,reviewed_by FROM van_kho_media WHERE id=$1',[media]);assert.notEqual(res.rows[0].uploaded_by,res.rows[0].reviewed_by);
  await db.query('INSERT INTO van_kho_review_events(doc_id,actor_id,action,version) VALUES($1,$2,$3,$4)',[doc,actor2,'approved',1]);
  res=await db.query('SELECT count(*)::int AS n FROM van_kho_review_events WHERE doc_id=$1',[doc]);assert.equal(res.rows[0].n,1);
  console.log('PASS: migrations 022–023, DB constraints, draft/schedule privacy, independent media review, audit history on real PostgreSQL');
 }finally{await db.query('ROLLBACK');}
}finally{await db.end();}
