'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createApp}=require('../apps/api/src/server.cjs');

async function fixture(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-v7-test-'));
 const app=createApp({databaseFile:path.join(dir,'test.sqlite'),secureCookie:false});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${app.server.address().port}`;
 try{await fn(base);}finally{await app.close();fs.rmSync(dir,{recursive:true,force:true});}
}
function client(base){let cookie=''; return {
 async fetch(url,method='GET',json,extra={}){
  const res=await fetch(base+url,{method,headers:{...(json?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),origin:base,...extra},body:json?JSON.stringify(json):undefined});
  const c=res.headers.get('set-cookie');if(c){const next=c.split(';')[0];cookie=next.includes('Max-Age=0')?'':next;}
  const data=await res.json();return {status:res.status,data,headers:res.headers};
 },resetCookie(){cookie='';},getCookie(){return cookie;}
};}
const birth={label:'Thử nghiệm ẩn danh',date:'2004-04-24',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'};

test('API: public health + unauthenticated chart denied',async()=>fixture(async base=>{
 const a=client(base);assert.equal((await a.fetch('/api/health')).status,200);
 assert.equal((await a.fetch('/api/charts')).status,401);
 assert.equal((await a.fetch('/api/charts','POST',birth)).status,401);
 for(const name of ['lunar','auxiliary','tuhoa','cycles','year-stars','tuvi','verify']){
  const script=await fetch(base+'/engine/'+name+'.js');assert.equal(script.status,200);assert.match(script.headers.get('content-type'),/javascript/);assert.equal(await script.text(),fs.readFileSync(require('../packages/engine/assets.cjs').browserEnginePath(name),'utf8'));
 }
 assert.equal((await fetch(base+'/engine/unknown.js')).status,404);
 const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/THIÊN ĐỒ/);
 assert.equal((await fetch(base+'/..%2f..%2fetc%2fpasswd')).status,404);
}));

test('API: register → session → calculate/save → reopen → delete/logout',async()=>fixture(async base=>{
 const c=client(base);
 const sign=await c.fetch('/api/auth/register','POST',{email:'Test@Example.com',password:'TenCharPassword1!'});
 assert.equal(sign.status,201);assert.equal(sign.data.user.email,'test@example.com');
 assert.ok(sign.headers.get('set-cookie').includes('HttpOnly'));
 assert.equal((await c.fetch('/api/auth/me')).data.user.email,'test@example.com');
 let save=await c.fetch('/api/charts','POST',birth);assert.equal(save.status,201);
 assert.equal(save.data.ruleSet,'tam-hop-core-v6.0');
 const list=await c.fetch('/api/charts');assert.equal(list.data.charts.length,1);
 const id=save.data.id;
 const opened=await c.fetch('/api/charts/'+id);
 assert.equal(opened.status,200);assert.equal(opened.data.result.houses.length,12);
 assert.equal(opened.data.result.coverage.mainStars,14);
 assert.equal(opened.data.chart.label,birth.label);
 assert.equal((await c.fetch('/api/charts/'+id,'DELETE')).status,200);
 assert.equal((await c.fetch('/api/charts')).data.charts.length,0);
 assert.equal((await c.fetch('/api/auth/logout','POST')).status,200);
 assert.equal((await c.fetch('/api/charts')).status,401);
}));

test('API: isolation between users and DELETE account cascade',async()=>fixture(async base=>{
 const a=client(base),b=client(base);
 await a.fetch('/api/auth/register','POST',{email:'a@example.com',password:'AAAAAAAAAAA1'});
 await b.fetch('/api/auth/register','POST',{email:'b@example.com',password:'BBBBBBBBBBB1'});
 const id=(await a.fetch('/api/charts','POST',birth)).data.id;
 assert.equal((await b.fetch('/api/charts/'+id)).status,404);
 assert.equal((await b.fetch('/api/charts/'+id,'DELETE')).status,404);
 assert.equal((await b.fetch('/api/charts')).data.charts.length,0);
 assert.equal((await a.fetch('/api/charts')).data.charts.length,1);
 assert.equal((await a.fetch('/api/auth/account','DELETE')).status,200);
 assert.equal((await a.fetch('/api/auth/me')).data.user,null);
 assert.equal((await b.fetch('/api/charts')).status,200);
}));

test('API: bad date, untrusted calculation, wrong password, cross-origin blocked',async()=>fixture(async base=>{
 const c=client(base);
 assert.equal((await c.fetch('/api/auth/register','POST',{email:'one@example.com',password:'123'})).status,400);
 await c.fetch('/api/auth/register','POST',{email:'one@example.com',password:'StrongEnough123!'});
 assert.equal((await c.fetch('/api/charts','POST',{...birth,date:'2025-02-31'})).status,400);
 assert.equal((await c.fetch('/api/charts','POST',{...birth,gender:'other'})).status,400);
 const saved=await c.fetch('/api/charts','POST',{...birth,calculated:{houses:['fake']}});
 assert.equal(saved.status,201);
 const opened=await c.fetch('/api/charts/'+saved.data.id);
 assert.equal(opened.data.result.houses.length,12);
 assert.equal((await c.fetch('/api/auth/logout','POST')).status,200);
 assert.equal((await c.fetch('/api/auth/login','POST',{email:'one@example.com',password:'NotThePassword12'})).status,401);
 assert.equal((await c.fetch('/api/auth/login','POST',{email:'one@example.com',password:'StrongEnough123!'})).status,200);
 const blocked=await c.fetch('/api/charts','POST',birth,{origin:'https://evil.example'});
 assert.equal(blocked.status,403);
}));
