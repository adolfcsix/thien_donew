'use strict';
// Display *input metadata*, never invent common predictions or blend scoring systems.
const FIELDS=['method','methodId','version','mode','date','hour','minute','year','calendar','leap','dayBoundary','unit','withHour','yMode','masters','degrees','sourceId'];
function describe(value){if(value===undefined)return '—';if(value===null)return '(không có)';if(typeof value==='boolean')return value?'Có':'Không';if(typeof value==='string'&&value.length<=120)return value;if(typeof value==='number'&&Number.isFinite(value))return String(value);return '(cấu trúc phức hợp)';}
function compareStudyEntries(entries){
 if(!Array.isArray(entries)||entries.length<2||entries.length>3||new Set(entries.map(x=>x.id)).size!==entries.length)throw Error('Chọn 2–3 bản ghi riêng biệt để đối chiếu');
 const disciplines=new Set(entries.map(x=>x.discipline));
 const methods=new Set(entries.map(x=>String(x.snapshot?.method??x.snapshot?.methodId??'không khai báo')));
 const fields=FIELDS.filter(k=>entries.some(e=>Object.hasOwn(e.snapshot||{},k))).map(key=>{
  const values=entries.map(e=>describe(e.snapshot?.[key]));return {key,values,match:values.every(v=>v===values[0])};
 });
 return {sameDiscipline:disciplines.size===1,sameMethod:disciplines.size===1&&methods.size===1&&![...methods][0].includes('không khai báo'),entries:entries.map(e=>({id:e.id,title:e.title,discipline:e.discipline,tags:e.tags||[],summary:e.summary||'',updatedAt:e.updatedAt})),fields};
}
module.exports={FIELDS,describe,compareStudyEntries};
