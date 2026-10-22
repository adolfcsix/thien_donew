'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES=new Set(['tu-vi','bat-tu','mai-hoa','luc-hao','ky-mon','phong-thuy','chiem-tinh','tarot','nghien-cuu','hoi-dap']);
const VISIBILITIES=new Set(['public','members','private']);
const REASONS=new Set(['spam','abuse','privacy','misinformation','copyright','other']);
const ACTIONS=new Set(['hide','restore','lock','unlock','pin','unpin','warn','suspend']);
function obj(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('expected object');return value;}
function str(value,max,min=1){if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw Error('invalid text');return value.trim();}
/** Plain text only: no markup, external URL embedding or untrusted HTML. */
function plain(value,max,min=1){let s=str(value,max,min);if(/[<>]/.test(s)||/\b(?:javascript:|data:|file:|vbscript:)/i.test(s))throw Error('unsafe markup');return s;}
function uuid(value){if(typeof value!=='string'||!UUID.test(value))throw Error('invalid id');return value;}
function thread(raw,allowExistingImage=false){const x=obj(raw);if(['attachmentUrl','imageUrl','attachments','html','embed'].some(k=>Object.hasOwn(x,k)))throw Error('unsupported external attachment');const category=str(x.category,36);if(!CATEGORIES.has(category))throw Error('unknown subject');const visibility=x.visibility===undefined?'public':str(x.visibility,12);if(!VISIBILITIES.has(visibility))throw Error('invalid visibility');const title=plain(x.title===undefined||x.title===null||typeof x.title==='string'&&!x.title.trim()?'Bài chia sẻ':x.title,180,3),imageId=x.imageId===undefined||x.imageId===null||x.imageId===''?null:uuid(x.imageId),body=plain(x.body??'',12000,0);if(!body&&!imageId&&!allowExistingImage)throw Error('Nội dung hoặc ảnh là bắt buộc');const alias=x.chartAlias===undefined||x.chartAlias===null||x.chartAlias===''?null:plain(x.chartAlias,80);const chartId=x.chartId===undefined||x.chartId===null||x.chartId===''?null:uuid(x.chartId);const chartShared=x.shareChart===true;if(chartShared&&!chartId)throw Error('chart required');if(x.shareChart!==undefined&&typeof x.shareChart!=='boolean')throw Error('chart consent invalid');if(chartId&&!chartShared)throw Error('chart consent required');return {category,visibility,title,body,imageId,chartId,chartAlias:chartShared?alias:null,chartShared};}
function comment(raw){const x=obj(raw);return {body:plain(x.body,4000,2),parentId:x.parentId?uuid(x.parentId):null};}
function report(raw){const x=obj(raw);const reason=str(x.reason,24);if(!REASONS.has(reason))throw Error('invalid reason');return {reason,explanation:x.explanation===undefined?'':plain(x.explanation,800,0)};}
function moderate(raw){const x=obj(raw);const action=str(x.action,32);if(!ACTIONS.has(action))throw Error('invalid moderation action');const reason=plain(x.reason,800,8);return {action,reason};}
function page(v,max=200000){if(v===undefined)return 0;if(typeof v!=='string'||!/^(?:0|[1-9][0-9]*)$/.test(v)||v.length>7)throw Error('invalid offset');const n=Number(v);if(!Number.isSafeInteger(n)||n>max)throw Error('invalid offset');return n;}
/** Escape LIKE metacharacters, then add wildcards in parameterized SQL. */
function search(v){if(v===undefined||v==='')return '';return plain(v,100,0).replace(/[\\%_]/g,'\\$&');}
function visible(row,viewer,moderator=false){if(!row||row.state!=='visible')return false;if(moderator||viewer&&row.author_id===viewer)return true;return row.visibility==='public'||row.visibility==='members'&&!!viewer;}
/** Do not transfer DOB/hour/sex/ruleSet or personal chart snapshot to the forum. */
function chartPreview(row){if(!row?.chart_shared)return null;return {type:'linked-private-chart',alias:row.chart_alias||'Lá số đã ẩn thông tin',detailsHidden:true};}
module.exports={UUID,CATEGORIES,VISIBILITIES,REASONS,ACTIONS,thread,comment,report,moderate,page,search,visible,chartPreview,uuid,plain};
