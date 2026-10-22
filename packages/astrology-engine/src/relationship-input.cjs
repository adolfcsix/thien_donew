'use strict';
const E=require('./western-input.cjs'),M=require('../../knowledge/src/relationship-method-v11128.json');
const canonicalNatal=raw=>{const input=E.validateInput(raw);for(const k of Object.keys(input))if(typeof input[k]==='number'&&Object.is(input[k],-0))input[k]=0;return input;};
const METHOD=M.id,clone=x=>JSON.parse(JSON.stringify(x)),norm=n=>((n%360)+360)%360;
const metadata=()=>{const {crossAspectAngles,orbPolicy,compositeHouses,contexts,...v}=M;return clone(v);};
function number(n,min,max){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Tham số góc nằm ngoài phạm vi.');return n;}
function validateRelationshipInput(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.method!==METHOD)throw Error('Phương pháp Chiêm tinh quan hệ không được hỗ trợ.');
 if(JSON.stringify(raw).length>2048)throw Error('Đầu vào quan hệ vượt giới hạn 2048 ký tự.');
 if(!raw.knowledge||Object.keys(metadata()).some(k=>raw.knowledge[k]!==metadata()[k]))throw Error('Phiên bản phương pháp/tri thức quan hệ chưa được hỗ trợ; không tự nâng cấp.');
 if(typeof raw.includeAngles!=='boolean'||!M.compositeHouses.includes(raw.compositeHouses)||!M.contexts.includes(raw.context))throw Error('Trục, hệ nhà Composite hoặc bối cảnh không hợp lệ.');
 return {method:METHOD,knowledge:metadata(),a:canonicalNatal(raw.a),b:canonicalNatal(raw.b),orb:number(raw.orb,0,10)||0,includeAngles:raw.includeAngles,compositeHouses:raw.compositeHouses,context:raw.context};
}
function createRelationshipInput(a,b,options={}){return validateRelationshipInput({method:METHOD,knowledge:metadata(),a,b,orb:options.orb??6,includeAngles:options.includeAngles??true,compositeHouses:options.compositeHouses??'midpoint-cusps',context:options.context??'general'});}
function exportRelationshipInput(input){return {format:'thien-do.western-relationship',version:1,input:validateRelationshipInput(input)};}
function parseRelationshipInput(raw){if(typeof raw==='string'){if(new TextEncoder().encode(raw).byteLength>16384)throw Error('Tệp quan hệ vượt 16 KiB.');try{raw=JSON.parse(raw);}catch{throw Error('JSON quan hệ không hợp lệ.');}}if(!raw||raw.format!=='thien-do.western-relationship'||raw.version!==1)throw Error('Định dạng quan hệ không hỗ trợ.');return validateRelationshipInput(raw.input);}
module.exports={METHOD,getRelationshipMethod:()=>clone(M),validateRelationshipInput,createRelationshipInput,exportRelationshipInput,parseRelationshipInput};
