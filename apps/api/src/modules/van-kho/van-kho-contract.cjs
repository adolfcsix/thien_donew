'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUBJECTS=new Set(['nhap-mon','tu-vi','bat-tu','mai-hoa','luc-hao','ky-mon','kinh-dich','phong-thuy','lich-phap','chiem-tinh','tarot','than-so-hoc','truong-phai','doi-chieu','thuc-hanh','khac']);
function field(v,max){return typeof v==='string'&&v.trim().length>0&&v.length<=max?v.trim():null;}
function draft(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid document');
 const slug=field(raw.slug,120),title=field(raw.title,220),subject=field(raw.subject,60),body=field(raw.body,100000);
 if(!slug||!SLUG.test(slug)||!title||!subject||!SUBJECTS.has(subject)||!body)throw Error('Invalid slug, title, subject or content');
 if(raw.body.includes('\0'))throw Error('Binary content prohibited');
 if(!Array.isArray(raw.tags)||raw.tags.length>12||raw.tags.some(t=>!field(t,40)||!/^[\p{L}0-9 -]+$/u.test(t)))throw Error('Invalid tags');
 if(raw.excerpt!==undefined&&(typeof raw.excerpt!=='string'||raw.excerpt.length>1000))throw Error('Invalid excerpt');
 if(raw.authorId!==undefined&&raw.authorId!==null&&!UUID.test(String(raw.authorId)))throw Error('Invalid author');
 return {slug,title,subject,body:raw.body,excerpt:raw.excerpt||'',tags:[...new Set(raw.tags)],authorId:raw.authorId||null};
}
function shouldPublish(status,scheduledAt,now){return status==='published'||(status==='scheduled'&&typeof scheduledAt==='string'&&new Date(scheduledAt).getTime()<=now);}
// API sends content as a string; client renders it as TEXT, never unsafe HTML.
module.exports={UUID,SLUG,SUBJECTS,draft,shouldPublish};
