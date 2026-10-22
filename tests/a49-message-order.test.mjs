import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);
const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
const {CommunityHubService}=require('../apps/api/dist/modules/community-hub/community-hub.service.js');
async function fixture(size){
 const pg=await PGlite.create({dataDir:'memory://'}),viewer=randomUUID(),peer=randomUUID(),conversation=randomUUID();
 await pg.exec('CREATE TABLE direct_conversations(id uuid PRIMARY KEY,first_user uuid,second_user uuid);CREATE TABLE direct_messages(id bigserial PRIMARY KEY,conversation_id uuid,sender_id uuid,client_id uuid,body text,created_at timestamptz DEFAULT NOW());CREATE TABLE direct_blocks(blocker_id uuid,blocked_id uuid)');
 await pg.query('INSERT INTO direct_conversations VALUES($1,$2,$3)',[conversation,viewer,peer]);
 for(let i=0;i<size;i++)await pg.query('INSERT INTO direct_messages(conversation_id,sender_id,client_id,body) VALUES($1,$2,$3,$4)',[conversation,peer,randomUUID(),'message '+(i+1)]);
 const query=async(c,sql,p)=>{const r=await c.query(sql,p);return{rows:r.rows,rowCount:r.affectedRows||r.rows.length}};
 const db={query:(sql,p)=>query(pg,sql,p),transaction:fn=>pg.transaction(c=>fn({query:(sql,p)=>query(c,sql,p)}))};
 return{pg,conversation,service:new CommunityHubService(db,{required:async()=>({id:viewer})},{})};
}
test('actual message service returns numeric chronological IDs and exact older cursor across 9/10 boundary',async()=>{
 const f=await fixture(65);try{const latest=await f.service.messages({},f.conversation);assert.deepEqual(latest.messages.map(m=>m.id),Array.from({length:50},(_,i)=>String(i+16)));assert.equal(latest.nextBefore,'16');const older=await f.service.messages({},f.conversation,latest.nextBefore);assert.deepEqual(older.messages.map(m=>m.id),Array.from({length:15},(_,i)=>String(i+1)));assert.equal(older.nextBefore,null);}finally{await f.pg.close()}
});
test('three actual service pages cross 99/100 with no missing or repeated IDs',async()=>{
 const f=await fixture(150);try{let cursor,ids=[],pages=0;do{const r=await f.service.messages({},f.conversation,cursor);ids=[...r.messages.map(m=>m.id),...ids];cursor=r.nextBefore;pages++;assert.ok(pages<=3);}while(cursor);assert.deepEqual(ids,Array.from({length:150},(_,i)=>String(i+1)));assert.equal(new Set(ids).size,150);}finally{await f.pg.close()}
});
