'use strict';
/** Search only explicitly fetched owner-scoped personal records plus public navigation. */
function fold(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();}
function workspaceIndex({profiles=[],charts=[],entries=[],navigation=[]}){
 return [
  ...profiles.map(p=>({id:p.id,kind:'profile',title:p.name,subtitle:[p.date,p.birthPlace].filter(Boolean).join(' · '),href:`/birth-profiles#profile-${p.id}`,search:[p.name,p.date,p.birthPlace,p.notes].join(' ')})),
  ...charts.map(c=>({id:c.id,kind:'chart',title:c.label,subtitle:`Tử Vi · ${c.date}`,href:'/collection',search:[c.label,c.date,c.gender].join(' ')})),
  ...entries.map(e=>({id:e.id,kind:'study',title:e.title,subtitle:e.discipline,href:`/study#entry-${e.id}`,search:[e.title,e.summary,e.notes,e.discipline,...(e.tags||[])].join(' ')})),
  ...navigation.map(n=>({id:n.href,kind:'tool',title:n.text,subtitle:n.caption,href:n.href,search:[n.text,n.caption,n.keywords].join(' ')})),
 ];
}
function searchWorkspace(index,query,{kind='all',limit=80}={}){
 const tokens=fold(query).split(' ').filter(Boolean).slice(0,10);
 if(!tokens.length)return [];
 return index.filter(x=>(kind==='all'||x.kind===kind)&&tokens.every(t=>fold(x.search).includes(t))).slice(0,limit);
}
module.exports={fold,workspaceIndex,searchWorkspace};
