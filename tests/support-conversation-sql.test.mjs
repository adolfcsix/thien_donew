/** Real service and disposable SQL; no email or remote provider calls. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Explicit isolated PGlite runtime required');
const {PGlite}=await import(pathToFileURL(resolve(process.env.THIENDO_SQL_TEST_MODULE)).href);
const {CommunityHubService}=require('../apps/api/dist/modules/community-hub/community-hub.service.js');
const member='10000000-0000-4000-8000-000000000001',owner='20000000-0000-4000-8000-000000000002',admin='30000000-0000-4000-8000-000000000003';
test('support creates once without email verification, prefers owner, respects configuration, blocks and missing operators',async()=>{
 const previous=process.env.SUPPORT_ADMIN_USER_ID;delete process.env.SUPPORT_ADMIN_USER_ID;
 const pg=new PGlite();let denied=false;
 try{
 await pg.exec(`CREATE TABLE users(id uuid PRIMARY KEY,created_at timestamptz DEFAULT now());CREATE TABLE admin_memberships(user_id uuid PRIMARY KEY,role text);CREATE TABLE account_blocks(user_id uuid);CREATE TABLE direct_blocks(blocker_id uuid,blocked_id uuid);CREATE TABLE direct_conversations(id uuid PRIMARY KEY,first_user uuid,second_user uuid,initiated_by uuid,UNIQUE(first_user,second_user));`);
 const db={query:(...args)=>pg.query(...args),transaction:fn=>pg.transaction(tx=>fn(tx))};
 const auth={required:async()=>({id:member}),assertSessionInTransaction:async()=>{if(denied)throw Error('Session revoked');}};
 const service=new CommunityHubService(db,auth,{});
 assert.equal((await service.supportConversation({})).available,false);
 for(const id of [member,owner,admin])await pg.query('INSERT INTO users(id) VALUES($1)',[id]);
 await pg.query("INSERT INTO admin_memberships VALUES($1,'owner'),($2,'admin')",[owner,admin]);
 const first=await service.supportConversation({});assert.equal(first.peerId,owner);
 assert.equal((await service.supportConversation({})).id,first.id);
 assert.equal((await pg.query('SELECT count(*)::int n FROM direct_conversations')).rows[0].n,1);
 process.env.SUPPORT_ADMIN_USER_ID=admin;assert.equal((await service.supportConversation({})).peerId,admin);
 await pg.query('INSERT INTO direct_blocks VALUES($1,$2)',[admin,member]);assert.equal((await service.supportConversation({})).available,false);
 await pg.query('INSERT INTO account_blocks VALUES($1)',[admin]);assert.equal((await service.supportConversation({})).available,false);
 denied=true;await assert.rejects(()=>service.supportConversation({}),/Session revoked/);
 }finally{if(previous===undefined)delete process.env.SUPPORT_ADMIN_USER_ID;else process.env.SUPPORT_ADMIN_USER_ID=previous;await pg.close();}
});
