import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),entry=process.env.THIENDO_SQL_TEST_MODULE;
if(!entry)throw Error('THIENDO_SQL_TEST_MODULE required: use isolated QA database only');
const {PGlite}=await import(pathToFileURL(entry).href),db=await PGlite.create({dataDir:'memory://'});
try{
 await db.exec('CREATE ROLE thiendo_app');const names=readdirSync(resolve(root,'infrastructure/db')).filter(n=>/^\d{3}_.*\.sql$/.test(n)).sort();assert.equal(names.length,36);
 for(const n of names.slice(0,32))await db.exec(readFileSync(resolve(root,'infrastructure/db',n),'utf8'));
 const user=randomUUID(),book=randomUUID(),post=randomUUID(),entitlement=randomUUID();await db.query("INSERT INTO users(id,email,password_hash,salt,username) VALUES($1,'upgrade@example.invalid','fixture','fixture','upgrade_member')",[user]);
 await db.query("INSERT INTO library_books(id,slug,title,author,subject,access_level,status,license_name,license_proof) VALUES($1,'upgrade-book','Sách giữ nguyên','QA','tu-vi','pro','published','Tác giả','Fixture')",[book]);await db.query("INSERT INTO content_posts(id,slug,title,body,published) VALUES($1,'upgrade-post','Bài giữ nguyên','Nội dung giữ nguyên',true)",[post]);await db.query("INSERT INTO pro_entitlements(id,user_id,features,starts_at,expires_at) VALUES($1,$2,'[\"premium-report\"]',clock_timestamp(),clock_timestamp()+interval '30 days')",[entitlement,user]);
 const before=await db.query('SELECT id,email,password_hash,salt FROM users WHERE id=$1',[user]);await db.exec(readFileSync(resolve(root,'infrastructure/db',names[32]),'utf8'));
 assert.deepEqual((await db.query('SELECT id,email,password_hash,salt FROM users WHERE id=$1',[user])).rows,before.rows);const savedBook=(await db.query('SELECT status,submission_status,submitted_by FROM library_books WHERE id=$1',[book])).rows[0];assert.equal(savedBook.status,'published');assert.equal(savedBook.submission_status,'draft');assert.equal(savedBook.submitted_by,null);assert.equal((await db.query('SELECT body,published FROM content_posts WHERE id=$1',[post])).rows[0].body,'Nội dung giữ nguyên');assert.equal((await db.query('SELECT user_id FROM pro_entitlements WHERE id=$1',[entitlement])).rows[0].user_id,user);
 for(const name of ['expert_credentials','direct_conversations','direct_messages','direct_read_receipts','direct_blocks','direct_message_reports','premium_sections'])for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal((await db.query('SELECT has_table_privilege($1,$2,$3) AS ok',['thiendo_app',name,privilege])).rows[0].ok,true,name+' '+privilege);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM premium_sections WHERE enabled=true')).rows[0].n,2);console.log(JSON.stringify({verdict:'PASS',migration:names[32],previousUsersPreserved:true,previousBooksAndPostsPreserved:true,proEntitlementsPreserved:true,allNewTablesHaveAppGrants:true,defaultProPolicies:2,sha256:createHash('sha256').update(readFileSync(resolve(root,'infrastructure/db',names[32]))).digest('hex'),engine:'PGlite WASM; native PostgreSQL not certified'}));
}finally{await db.close();}
