'use strict';
const KINDS = Object.freeze(['guide','policy']);
function validKind(kind){return KINDS.includes(kind);}
function validSlug(slug){return typeof slug==='string'&&slug.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);}
function safeHref(href){return typeof href==='string'&&href.length<=180&&/^\/(?!\/)[a-z0-9\-/]*$/.test(href);}
function parseDraft(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('body');
 for(const key of ['title','summary','body'])if(typeof input[key]!=='string')throw Error('missing '+key);
 const title=input.title.trim(),summary=input.summary.trim(),body=input.body.trim();
 if(title.length<3||title.length>180||summary.length>900||body.length<50||body.length>140000)throw Error('size');
 if(!safeHref(input.toolHref)||!safeHref(input.relatedHref))throw Error('href');
 if(/<\s*\/?\s*(?:script|iframe|svg|object|embed|form|style|img)\b/i.test(body)||/\!\[[^\]]*\]\(\s*(?:https?:|data:|javascript:)/i.test(body))throw Error('unsafe markdown');
 return {title,summary,body,toolHref:input.toolHref,relatedHref:input.relatedHref};
}
module.exports={validKind,validSlug,safeHref,parseDraft};
