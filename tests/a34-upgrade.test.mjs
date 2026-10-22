import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
const modulePath=process.env.THIENDO_SQL_TEST_MODULE;if(!modulePath)throw Error('THIENDO_SQL_TEST_MODULE required for isolated PGlite upgrade test');
const {PGlite}=await import(pathToFileURL(modulePath).href);const db=await PGlite.create({dataDir:'memory://'}),root=resolve(import.meta.dirname,'..');
try{
 await db.exec('CREATE ROLE thiendo_app');
 const names=readdirSync(resolve(root,'infrastructure/db')).filter(n=>/^\d{3}_.*\.sql$/.test(n)&&Number(n.slice(0,3))<=32).sort();assert.equal(names.length,32);
 for(const name of names.slice(0,31))await db.exec(readFileSync(resolve(root,'infrastructure/db',name),'utf8'));
 const id=randomUUID(),body='Nội dung từ V11.164.60 phải còn nguyên.\nDòng thứ hai.';
 await db.query('INSERT INTO content_posts(id,slug,title,body,published) VALUES($1,$2,$3,$4,true)',[id,'existing-before-upgrade','Bài viết trước nâng cấp',body]);
 await db.exec(readFileSync(resolve(root,'infrastructure/db',names.at(-1)),'utf8'));
 const p=(await db.query('SELECT revision,body,published,deleted_at FROM content_posts WHERE id=$1',[id])).rows[0];assert.equal(p.revision,1);assert.equal(p.body,body);assert.equal(p.published,true);assert.equal(p.deleted_at,null);
 const version=(await db.query('SELECT snapshot,action,actor_id FROM content_post_versions WHERE post_id=$1',[id])).rows[0];assert.equal(version.snapshot.body,body);assert.equal(version.snapshot.published,true);assert.equal(version.action,'baseline');assert.equal(version.actor_id,null);
 assert.equal((await db.query('SELECT count(*)::int n FROM admin_permission_sets')).rows[0].n,0);
 assert.equal((await db.query("SELECT has_table_privilege('thiendo_app','admin_permission_sets','SELECT') AND has_table_privilege('thiendo_app','admin_permission_sets','INSERT') AND has_table_privilege('thiendo_app','admin_permission_sets','UPDATE') AND has_table_privilege('thiendo_app','admin_permission_sets','DELETE') allowed")).rows[0].allowed,true);
 console.log(JSON.stringify({verdict:'PASS',migration:'032_admin_console.sql',oldRowsPreserved:true,publishedStatePreserved:true,versionBackfillVerified:true,legacyAdminScopesUnchanged:true,appGrantsVerified:true,sqlEngine:'PGlite WASM; native PostgreSQL not certified',sha256:createHash('sha256').update(readFileSync(resolve(root,'infrastructure/db',names.at(-1)))).digest('hex')}));
}finally{await db.close();}
