import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const run=process.env.E2E_LOCAL_DB_CONFIRM==='YES'&&/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL||'');
const pg=run?require('pg'):null;
test('V11.163 seeded portal tables, private revisions and 15+8 articles on temporary PostgreSQL', {skip:!run?'Requires disposable CI PostgreSQL with E2E_LOCAL_DB_CONFIRM=YES':''},async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
 try{
  const rows=await pool.query(`SELECT kind,COUNT(*)::int AS n FROM portal_documents WHERE published_revision IS NOT NULL GROUP BY kind`);
  const sizes=Object.fromEntries(rows.rows.map(r=>[r.kind,r.n]));
  assert.ok(sizes.guide>=15);assert.ok(sizes.policy>=8);
  const {rows:cols}=await pool.query(`SELECT document_id,version,title,body FROM portal_revisions ORDER BY created_at DESC LIMIT 1`);
  assert.ok(cols[0]?.body.length>50);
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const current=(await client.query(`SELECT id,current_revision,published_revision FROM portal_documents WHERE kind='guide' ORDER BY slug LIMIT 1 FOR UPDATE`)).rows[0];
   const previous=(await client.query(`SELECT r.title,r.body FROM portal_revisions r WHERE r.document_id=$1 AND r.version=$2`,[current.id,current.published_revision])).rows[0];
   const next=current.current_revision+1;
   const inserted=await client.query(`INSERT INTO portal_revisions(document_id,version,title,summary,body,tool_href,related_href) VALUES($1,$2,'DRAFT SHOULD NOT LEAK','','Protected draft preview text for SQL verification only.','/chart','/van-kho') RETURNING version`,[current.id,next]);
   assert.equal(inserted.rows[0].version,next);
   await client.query(`UPDATE portal_documents SET current_revision=$2,workflow='draft' WHERE id=$1`,[current.id,next]);
   const publicRow=(await client.query(`SELECT r.title,r.body FROM portal_documents d JOIN portal_revisions r ON r.document_id=d.id AND r.version=d.published_revision WHERE d.id=$1`,[current.id])).rows[0];
   assert.equal(publicRow.title,previous.title);
   assert.equal(publicRow.body,previous.body);
  }finally{await client.query('ROLLBACK');client.release();}
 }finally{await pool.end();}
});
