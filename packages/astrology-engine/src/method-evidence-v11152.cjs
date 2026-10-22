'use strict';
/** V11.152 — Method provenance/fingerprint for internal calculated evidence only.
 * Does NOT certify traditional school correctness or supply AI interpretations.
 * Do not expose hashes of user birth data in public API responses: low-entropy inputs
 * may be brute-forced. Store the envelope with access control in a private system.
 */
const {createHash}=require('node:crypto');
const {readFileSync,existsSync}=require('node:fs');
const {resolve,relative,dirname,extname}=require('node:path');
const manifest=require('../../knowledge/src/method-coverage.json');
const SCHEMA_VERSION=1;
const REGISTRY=new Map(manifest.disciplines.map(row=>[row.methodId,Object.freeze({...row,pathsPresent:Object.freeze({...row.pathsPresent})})]));
const toSha=s=>createHash('sha256').update(s).digest('hex');
const HASH=/^[a-f0-9]{64}$/;
function strictStringify(value){
 const seen=new WeakSet();let nodes=0;
 function normal(v,depth){
  if(depth>40||++nodes>100000)throw new RangeError('Evidence payload too deep/large');
  if(v===null||typeof v==='string'||typeof v==='boolean')return v;
  if(typeof v==='number'){
   if(!Number.isFinite(v))throw new TypeError('No NaN/Infinity in calculated evidence');
   return Object.is(v,-0)?0:v;
  }
  if(typeof v!=='object')throw new TypeError('Only JSON data can form evidence');
  if(seen.has(v))throw new TypeError('Cycle in calculated evidence');
  seen.add(v);
  let out;
  if(Array.isArray(v)){
   if(Object.keys(v).length!==v.length||v.some((_,i)=>!Object.hasOwn(v,i)))throw new TypeError('Sparse/extended arrays cannot form evidence');
   out=v.map(x=>normal(x,depth+1));
  }else{
   const proto=Object.getPrototypeOf(v);
   if(proto!==Object.prototype&&proto!==null)throw new TypeError('Only plain JSON objects accepted');
   out={};
   for(const key of Object.keys(v).sort()){
    if(['__proto__','constructor','prototype'].includes(key))throw new TypeError('Dangerous evidence key');
    const descriptor=Object.getOwnPropertyDescriptor(v,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new TypeError('Accessors not permitted');
    Object.defineProperty(out,key,{value:normal(descriptor.value,depth+1),enumerable:true,configurable:true,writable:true});
   }
  }
  seen.delete(v);return out;
 }
 const text=JSON.stringify(normal(value,0));
 if(text.length>2_000_000)throw new RangeError('Evidence too large');
 return text;
}
function digestOf(value){return toSha(strictStringify(value));}
function methodFor(id){
 if(typeof id!=='string'||!REGISTRY.has(id))throw new RangeError('Unknown/unreviewed calculation method; manual migration required');
 return REGISTRY.get(id);
}
function sourceProof(root,method){
 if(typeof root!=='string'||!root)throw new TypeError('Repository root required');
 const absRoot=resolve(root),lockfile=toSha(readFileSync(resolve(absRoot,'package-lock.json')));
 const visited=new Map();
 const pattern=/\brequire\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
 function visit(file){
  let location=resolve(file);
  if(!extname(location)){
   location=['.js','.cjs','.json'].map(ext=>location+ext).find(existsSync)||location;
  }
  const relativeName=relative(absRoot,location).replaceAll('\\','/');
  if(relativeName==='..'||relativeName.startsWith('../')||relativeName.startsWith('/'))throw new Error('Dependency outside repository');
  if(visited.has(relativeName))return;
  if(visited.size>=1000)throw new RangeError('Method dependency closure unexpectedly large');
  const bytes=readFileSync(location);visited.set(relativeName,toSha(bytes));
  if(!/\.(c?js)$/.test(location))return;
  const source=bytes.toString('utf8');
  for(const match of source.matchAll(pattern))visit(resolve(dirname(location),match[1]));
 }
 visit(resolve(absRoot,method.implementation));
 const sources=[...visited].sort((a,b)=>a[0].localeCompare(b[0])).map(([path,sha256])=>({path,sha256}));
 // Relative first-party dependency closure + separately pinned 3rd-party lockfile.
 return {implementation:method.implementation,sourceSha256:digestOf(sources),sourceClosureCount:sources.length,lockfileSha256:lockfile};
}

function createEvidence({repositoryRoot,methodId,input,calculated,school,referenceRecordId=null}={}){
 const method=methodFor(methodId);
 if(typeof school!=='string'||school!==method.methodScope)throw new RangeError('School/method scope must match the registered calculation version');
 if(referenceRecordId!==null&&(!/^[-A-Za-z0-9_.:/]{4,180}$/.test(referenceRecordId)))throw new RangeError('Reference record id invalid');
 const record={schemaVersion:SCHEMA_VERSION,discipline:method.id,methodId:method.methodId,phase:method.phase,
   methodScope:method.methodScope,referenceRecordId,precisionGate:method.witnessGate,
   independentlyVerified:false,
   ...sourceProof(repositoryRoot,method),inputSha256:digestOf(input),resultSha256:digestOf(calculated)};
 return Object.freeze({...record,evidenceSha256:digestOf(record)});
}
/** Fail closed: never silently recompute or re-label stored calculations. */
function verifyEvidence(saved,{repositoryRoot,input,calculated}={}){
 if(!saved||typeof saved!=='object'||Array.isArray(saved)||saved.schemaVersion!==SCHEMA_VERSION)throw new RangeError('Unsupported saved method evidence version');
 const method=methodFor(saved.methodId);
 const data={...saved};delete data.evidenceSha256;
 if(!HASH.test(saved.evidenceSha256||'')||digestOf(data)!==saved.evidenceSha256)throw new Error('EVIDENCE_TAMPERED');
 if(saved.discipline!==method.id||saved.methodScope!==method.methodScope||saved.precisionGate!==method.witnessGate||saved.independentlyVerified!==false)throw new Error('EVIDENCE_METHOD_DRIFT');
 const now=sourceProof(repositoryRoot,method);
 if(saved.sourceSha256!==now.sourceSha256||saved.sourceClosureCount!==now.sourceClosureCount||saved.lockfileSha256!==now.lockfileSha256||saved.implementation!==now.implementation)
  return Object.freeze({status:'REVIEW_REQUIRED',reason:'METHOD_SOURCE_CHANGED'});
 if(input!==undefined&&saved.inputSha256!==digestOf(input))return Object.freeze({status:'REVIEW_REQUIRED',reason:'INPUT_CHANGED'});
 if(calculated!==undefined&&saved.resultSha256!==digestOf(calculated))return Object.freeze({status:'REVIEW_REQUIRED',reason:'RESULT_CHANGED'});
 return Object.freeze({status:'MATCHES_FROZEN_METHOD',reason:null});
}
module.exports=Object.freeze({SCHEMA_VERSION,methodFor,strictStringify,digestOf,createEvidence,verifyEvidence});
