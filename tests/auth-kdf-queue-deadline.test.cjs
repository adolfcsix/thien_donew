'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const ts=require('typescript'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function fixture(){
 const callbacks=[],timers=new Map();let id=0;
 const source=ts.transpileModule(fs.readFileSync(path.join(root,'apps/api/src/modules/auth/auth.service.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
 const local=createRequire(path.join(root,'apps/api/src/modules/auth/auth.service.ts')),mod={exports:{}};
 const dependency={exports:{}};
 const dependencySource=ts.transpileModule(fs.readFileSync(path.join(root,'apps/api/src/modules/auth/account-deletion-error.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',dependencySource)(local,dependency,dependency.exports);
 vm.runInNewContext('(function(require,module,exports){'+source+'})',{Buffer,process,console,setTimeout(fn,ms){assert.equal(ms,5000);const key=++id;timers.set(key,fn);return key},clearTimeout(key){timers.delete(key)}})(name=>name==='node:crypto'?{...crypto,scrypt:(...args)=>callbacks.push(args.at(-1))}:name==='./account-deletion-error'?dependency.exports:local(name),mod,mod.exports);
 return {derive:mod.exports.derivePassword,callbacks,timers};
}
test('stalled password workers expire waiting requests and recover without starting expired work',async()=>{
 const f=fixture(),jobs=Array.from({length:36},()=>f.derive('test-password','test-salt').catch(e=>e));
 await Promise.resolve();assert.equal(f.callbacks.length,4);assert.equal(f.timers.size,32);
 const overflow=await f.derive('test-password','test-salt').catch(e=>e);assert.equal(overflow.getStatus(),429);
 for(const fn of [...f.timers.values()])fn();
 for(const cb of f.callbacks.splice(0))cb(null,Buffer.alloc(64));
 const results=await Promise.all(jobs);assert.equal(results.filter(v=>typeof v==='string').length,4);assert.equal(results.filter(v=>v.getStatus?.()===429).length,32);
 assert.equal(f.callbacks.length,0,'Timed-out work must never enter scrypt');
 const next=f.derive('test-password','test-salt');await Promise.resolve();assert.equal(f.callbacks.length,1);f.callbacks.shift()(null,Buffer.alloc(64));assert.equal((await next).length,128);
});
test('completed workers transfer slots to live waiters and clear their deadlines',async()=>{
 const f=fixture(),jobs=Array.from({length:5},()=>f.derive('test-password','test-salt'));
 await Promise.resolve();assert.equal(f.timers.size,1);
 f.callbacks.shift()(null,Buffer.alloc(64));await Promise.resolve();await Promise.resolve();assert.equal(f.timers.size,0);
 for(const cb of f.callbacks.splice(0))cb(null,Buffer.alloc(64));await Promise.all(jobs);
});
