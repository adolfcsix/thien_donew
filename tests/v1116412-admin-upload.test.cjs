const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const ts=require('typescript');
function source(file){
  const mod={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('module','exports','require',js)(mod,mod.exports,require);
  return mod.exports;
}
const {uploadPrivateFile}=source('apps/web/src/lib/upload-private-file.ts');
const contract=source('apps/web/src/features/admin/response-contract.ts');
async function server(work,run){
  const app=http.createServer(work);
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  try{return await run('http://127.0.0.1:'+app.address().port+'/upload');}
  finally{app.closeAllConnections();await new Promise(resolve=>app.close(resolve));}
}
const file=()=>new File([Buffer.from([0,255,1,2,123,125,60,62])],'fixture.bin',{type:'application/octet-stream'});
test('admin boundary rejects malformed objects, identifiers, integers and incomplete write receipts',()=>{
  const id='eb67c1cd-c4d2-4c08-b678-8d5584ab07ac';assert.equal(contract.adminId(id),id);assert.equal(contract.adminInteger(1,1),1);contract.adminUpdated({updated:true});
  for(const value of [null,[],false,'{}'])assert.throws(()=>contract.adminObject(value));
  for(const value of ['not-an-id','',1,null])assert.throws(()=>contract.adminId(value));
  for(const value of [-1,1.5,NaN,Infinity,'1'])assert.throws(()=>contract.adminInteger(value));
  assert.throws(()=>contract.adminUpdated({updated:false}));assert.throws(()=>contract.adminList([{}],contract.adminId));
});
test('private transport sends exact raw bytes and size header over real local HTTP, not JSON',async()=>{
  await server(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);assert.deepEqual(Buffer.concat(chunks),Buffer.from(await file().arrayBuffer()));assert.equal(req.headers['content-type'],'application/octet-stream');assert.equal(req.headers['x-book-file-bytes'],'8');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({uploaded:true,size:8}));},async url=>{
    const result=await uploadPrivateFile(url,file(),{'X-Book-File-Bytes':'8'},new AbortController().signal,1000);assert.deepEqual(result,{uploaded:true,size:8});
  });
});
test('private upload deadline covers a stalled response body and leaves caller controller untouched',async()=>{
  await server((req,res)=>{req.resume();res.writeHead(200,{'Content-Type':'application/json'});res.write('{"uploaded":');},async url=>{
    const caller=new AbortController(),start=Date.now();await assert.rejects(uploadPrivateFile(url,file(),{},caller.signal,150),/quá thời gian chờ/);assert.ok(Date.now()-start<3000);assert.equal(caller.signal.aborted,false);
  });
});
test('caller cancellation interrupts upload response reading without being mislabeled as timeout',async()=>{
  let reached;const receiving=new Promise(resolve=>reached=resolve);
  await server((req,res)=>{req.resume();res.writeHead(200,{'Content-Type':'application/json'});res.write('{');reached();},async url=>{
    const caller=new AbortController(),work=uploadPrivateFile(url,file(),{},caller.signal,5000);await receiving;caller.abort();await assert.rejects(work,error=>error.name==='AbortError');
  });
});
test('already aborted upload never reaches the HTTP endpoint',async()=>{
  let requests=0;await server((req,res)=>{requests++;res.end('{}');},async url=>{const caller=new AbortController();caller.abort();await assert.rejects(uploadPrivateFile(url,file(),{},caller.signal,1000),error=>error.name==='AbortError');assert.equal(requests,0);});
});
test('HTTP upload failure keeps server message; invalid JSON success cannot be treated as receipt',async()=>{
  await server((req,res)=>{req.resume();res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Đưa sách về bản nháp trước khi thay tệp'}));},async url=>{await assert.rejects(uploadPrivateFile(url,file(),{},new AbortController().signal,1000),/bản nháp/);});
  await server((req,res)=>{req.resume();res.writeHead(201,{'Content-Type':'application/json'});res.end('not-json');},async url=>{await assert.rejects(uploadPrivateFile(url,file(),{},new AbortController().signal,1000),/Biên nhận tải tệp chưa hợp lệ/);});
});
test('invalid upload deadlines are rejected before any network work',async()=>{
  for(const deadline of [0,-1,NaN,120001,1.5])await assert.rejects(uploadPrivateFile('http://127.0.0.1:1/upload',file(),{},new AbortController().signal,deadline),RangeError);
});
for(const status of [403,413,502])test('private upload preserves HTTP '+status+' when a proxy returns HTML without automatic retry',async()=>{
 let calls=0;
 await server((req,res)=>{calls++;req.resume();res.writeHead(status,{'Content-Type':'text/html'});res.end('<html>Proxy failure</html>');},async url=>{
  await assert.rejects(uploadPrivateFile(url,file(),{},new AbortController().signal,1000),e=>e.status===status&&e.message.includes('HTTP '+status)&&!e.message.includes('<html>'));
 });assert.equal(calls,1);
});
test('private upload preserves JSON permission explanation and safe request ID',async()=>{
 await server((req,res)=>{req.resume();res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Cần huy hiệu Chuyên gia đang hiệu lực',requestId:'11111111-1111-4111-8111-111111111111'}));},async url=>{
  await assert.rejects(uploadPrivateFile(url,file(),{},new AbortController().signal,1000),e=>e.status===403&&e.message==='Cần huy hiệu Chuyên gia đang hiệu lực'&&e.requestId==='11111111-1111-4111-8111-111111111111');
 });
});
