'use strict';
/** THIÊN ĐỒ V7 local full-stack foundation. Node 22+ only; no third-party deps. */
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { openDatabase } = require('./store.cjs');
const Engine = require('../../../packages/engine/tuvi.js');
const Verifier = require('../../../packages/engine/verify.js');
const {browserEnginePath}=require('../../../packages/engine/assets.cjs');
const BASE = path.resolve(__dirname, '../../..');
const WEB = path.join(BASE, 'apps', 'web');
const SESSION_AGE = 7 * 24 * 3600;
const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon' };
const limits = new Map();
function guid() { return crypto.randomUUID(); }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function passwordHash(password, salt) { return crypto.scryptSync(password, salt, 64, { N:16384, r:8, p:1 }).toString('hex'); }
function safeEqual(a,b) { const x=Buffer.from(a,'hex'), y=Buffer.from(b,'hex'); return x.length===y.length && crypto.timingSafeEqual(x,y); }
function limitAuth(key) {
  const now=Date.now();
  if(limits.size>2000) for(const [k,v] of limits) if(now-v.start>600000) limits.delete(k);
  const prev=limits.get(key);
  if(!prev || now-prev.start>600000){ limits.set(key,{start:now,count:1});return; }
  prev.count++; if(prev.count>12) throw fail(429,'Quá nhiều lượt thử. Vui lòng quay lại sau 10 phút.');
}
function fail(status,message){return Object.assign(new Error(message),{ status });}
function send(res,status,data,headers={}){ if(res.writableEnded) return; const body=JSON.stringify(data);res.writeHead(status,{ 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(body),...headers });res.end(body);}
async function readBody(req){
  const chunks=[];let size=0;
  for await (const chunk of req){size+=chunk.length;if(size>96*1024)throw fail(413,'Dữ liệu gửi quá lớn');chunks.push(chunk);}
  try{const obj=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!obj || typeof obj!=='object'||Array.isArray(obj))throw Error();return obj;}catch{throw fail(400,'JSON không hợp lệ');}
}
function getCookie(req,name){const raw=req.headers.cookie||'';const entry=raw.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));return entry?entry.slice(name.length+1):'';}
function canonicalEmail(v){if(typeof v!=='string')throw fail(400,'Email không hợp lệ');const email=v.trim().toLowerCase();if(email.length>150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail(400,'Email không hợp lệ');return email;}
function validatePassword(p){if(typeof p!=='string' || p.length<10 || Buffer.byteLength(p)>256)throw fail(400,'Mật khẩu cần từ 10 đến 256 byte');return p;}
function validateChart(x){
  if(typeof x.label!=='string'||!x.label.trim()||x.label.trim().length>70)throw fail(400,'Tên lá số 1–70 ký tự');
  const input={date:x.date,hour:x.hour,minute:x.minute,calendar:x.calendar,leap:x.leap,gender:x.gender};
  let result;try{ result=Engine.calculate(input); }catch(e){throw fail(400,e.message || 'Dữ liệu sinh không hợp lệ');}
  const v=Verifier.check(result);if(!v.passed) throw fail(422,'Kết quả an sao không qua kiểm tra cấu trúc');
  return {label:x.label.trim(),input,result};
}
function createApp({databaseFile=path.join(BASE,'data','thiendo.sqlite'), secureCookie=process.env.NODE_ENV==='production'}={}){
  const db=openDatabase(databaseFile);
  const cookie=(value,remove=false)=>`thiendo_session=${value}; Path=/; HttpOnly; SameSite=Lax; ${secureCookie?'Secure; ':''}Max-Age=${remove?0:SESSION_AGE}`;
  function userFor(req){const token=getCookie(req,'thiendo_session');if(!/^[a-f0-9]{64}$/.test(token))return null;
    const row=db.prepare('SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(token),Date.now());return row||null;
  }
  function requireUser(req){const u=userFor(req);if(!u)throw fail(401,'Vui lòng đăng nhập trước');return u;}
  function establish(res,u){const token=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(hash(token),u.id,Date.now()+SESSION_AGE*1000);return {'Set-Cookie':cookie(token)};}
  function assertOrigin(req){if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return;
    const origin=req.headers.origin;
    if(origin){try{const u=new URL(origin), host=req.headers.host;if(u.host!==host || !['http:','https:'].includes(u.protocol))throw Error();}catch{throw fail(403,'Yêu cầu khác nguồn gốc bị chặn');}}
    else if(req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site']))throw fail(403,'Chặn yêu cầu khác nguồn gốc');
  }
  async function api(req,res,uri){
    assertOrigin(req);
    const p=uri.pathname,method=req.method;
    if(p==='/api/health'&&method==='GET')return send(res,200,{ok:true,app:'Thien Do V7',database:'sqlite',engine:Engine.RULESET});
    if(p==='/api/auth/me'&&method==='GET')return send(res,200,{user:userFor(req)});
    if(p==='/api/auth/register'&&method==='POST'){
      limitAuth(req.socket.remoteAddress||'local');const x=await readBody(req),email=canonicalEmail(x.email),password=validatePassword(x.password);
      if(db.prepare('SELECT id FROM users WHERE email=?').get(email))throw fail(409,'Không thể tạo tài khoản với email này');
      const id=guid(), salt=crypto.randomBytes(16).toString('hex');db.prepare('INSERT INTO users(id,email,password_hash,salt) VALUES(?,?,?,?)').run(id,email,passwordHash(password,salt),salt);
      return send(res,201,{user:{id,email}},establish(res,{id}));
    }
    if(p==='/api/auth/login'&&method==='POST'){
      limitAuth(req.socket.remoteAddress||'local');const x=await readBody(req),email=canonicalEmail(x.email),password=validatePassword(x.password);
      const row=db.prepare('SELECT id,email,password_hash,salt FROM users WHERE email=?').get(email);
      const candidate=passwordHash(password,row?.salt||'c0f8d317e812738271eb9af583110004');
      if(!row||!safeEqual(candidate,row.password_hash))throw fail(401,'Email hoặc mật khẩu không đúng');
      return send(res,200,{user:{id:row.id,email:row.email}},establish(res,row));
    }
    if(p==='/api/auth/logout'&&method==='POST'){
      const token=getCookie(req,'thiendo_session');if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));return send(res,200,{ok:true},{'Set-Cookie':cookie('',true)});
    }
    if(p==='/api/auth/account'&&method==='DELETE'){
      const u=requireUser(req); db.prepare('DELETE FROM users WHERE id=?').run(u.id);return send(res,200,{deleted:true},{'Set-Cookie':cookie('',true)});
    }
    if(p==='/api/charts'&&method==='GET'){
      const u=requireUser(req);const rows=db.prepare('SELECT id,label,date,hour,minute,calendar,leap,gender,rule_set,created_at FROM charts WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100').all(u.id);
      return send(res,200,{charts:rows});
    }
    if(p==='/api/charts'&&method==='POST'){
      const u=requireUser(req),x=await readBody(req),v=validateChart(x);
      const count=db.prepare('SELECT COUNT(*) AS count FROM charts WHERE user_id=?').get(u.id).count;if(count>=100)throw fail(409,'Tối đa 100 lá số cho mỗi tài khoản');
      const id=guid(),a=v.input;
      db.prepare('INSERT INTO charts (id,user_id,label,date,hour,minute,calendar,leap,gender,rule_set) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,u.id,v.label,a.date,a.hour,a.minute,a.calendar,a.leap?1:0,a.gender,Engine.RULESET);
      return send(res,201,{id,ruleSet:Engine.RULESET,verified:true});
    }
    const match=p.match(/^\/api\/charts\/([0-9a-f-]{36})$/);
    if(match){const u=requireUser(req), id=match[1];
      if(method==='GET'){
        const row=db.prepare('SELECT * FROM charts WHERE id=? AND user_id=?').get(id,u.id);if(!row)throw fail(404,'Không tìm thấy lá số');
        const outdated=row.rule_set!==Engine.RULESET;
        const result=Engine.calculate({date:row.date,hour:row.hour,minute:row.minute,calendar:row.calendar,leap:Boolean(row.leap),gender:row.gender});
        return send(res,200,{chart:{id:row.id,label:row.label,date:row.date,hour:row.hour,minute:row.minute,calendar:row.calendar,leap:Boolean(row.leap),gender:row.gender,ruleSet:row.rule_set,createdAt:row.created_at},outdated,result});
      }
      if(method==='DELETE'){
        const change=db.prepare('DELETE FROM charts WHERE id=? AND user_id=?').run(id,u.id).changes;
        if(!change)throw fail(404,'Không tìm thấy lá số');return send(res,200,{deleted:true});
      }
    }
    throw fail(404,'API không tồn tại');
  }
  function serveStatic(req,res,uri){
    if(req.method!=='GET'&&req.method!=='HEAD')throw fail(405,'Phương thức không hỗ trợ');
    let pathname;try{pathname=decodeURIComponent(uri.pathname);}catch{throw fail(400,'Đường dẫn không hợp lệ');}
    if(pathname==='/' || pathname==='/index.html')pathname='/index.html';
    if(!/^\/(?:index\.html|assets\/[\w.-]+\.(?:css|js)|engine\/[\w.-]+\.js)$/.test(pathname))throw fail(404,'Không tìm thấy trang');
    const engine=pathname.match(/^\/engine\/([\w-]+)\.js$/);
    const file=engine?browserEnginePath(engine[1]):path.join(WEB,pathname.slice(1));
    if(!file||!fs.existsSync(file))throw fail(404,'Không tìm thấy trang');
    const buff=fs.readFileSync(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':buff.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:buff);
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    try{const uri=new URL(req.url,'http://localhost');if(uri.pathname.startsWith('/api/'))await api(req,res,uri);else serveStatic(req,res,uri);}
    catch(err){const status=err.status||500; if(status===500)console.error('[API]',err.message);send(res,status,{error:status===500?'Lỗi máy chủ':err.message});}
  });
  return {server,db,close(){return new Promise(resolve=>server.close(()=>{db.close();resolve();}));}};
}
if(require.main===module){ const port=Number(process.env.PORT||8080);const app=createApp();app.server.listen(port,'127.0.0.1',()=>console.log(`THIÊN ĐỒ V7 http://127.0.0.1:${port}`));}
module.exports={createApp};
