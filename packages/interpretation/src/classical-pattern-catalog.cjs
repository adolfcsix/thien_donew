'use strict';

/**
 * Research-only index based on named categories of pinned reference.
 * Not a natal placement evaluator or an independently verified verdict.
 * Reference descriptions/interpretations are intentionally not copied.
 */
const SOURCE_COMMIT='7922285d947b36610e7e31c232d8f1e2a0d0871d';
const SOURCE='https://github.com/Renhuai123/ziwei-doushu';
const definition=Object.freeze([
 ['dinh-phu','Định phú','patterns-dingfu.ts',[
  ['财荫夹印','unreachable'],['日月夹财','derivable'],['财禄夹马','derivable'],
  ['荫印拱身','unreachable'],['日月照璧','derivable'],['金灿光辉','derivable']
 ]],
 ['dinh-quy','Định quý','patterns-dinggui.ts',[
  ['日月夹命','derivable'],['日出扶桑','derivable'],['月落亥宫','derivable'],
  ['月生沧海','derivable'],['辅弼拱主','derivable'],['君臣庆会','derivable'],
  ['财印夹禄','unreachable'],['禄马佩印','derivable'],['坐贵向贵','derivable'],
  ['马头带剑','unreachable'],['七杀朝斗','derivable'],['日月并明','disputed'],
  ['明珠出海','derivable'],['日月同临','derivable'],['刑囚夹印','derivable'],
  ['科权禄拱','derivable'],['贪火相逢','derivable'],['武曲守垣','derivable'],
  ['府相朝垣','derivable'],['紫府朝垣','derivable'],['文星暗拱','unreachable'],
  ['权禄生逢','derivable'],['羊刃入庙','derivable'],['巨机居卯','derivable'],
  ['明禄暗禄','derivable'],['科明暗禄','disputed'],['金舆扶驾','unreachable']
 ]],
 ['dinh-ban','Định bần','patterns-dingpin.ts',[
  ['生不逢时','derivable'],['禄逢两杀','derivable'],['马落空亡','disputed'],
  ['日月藏辉','disputed'],['财与囚仇','derivable'],['一生孤贫','derivable'],
  ['君子在野','disputed'],['两重华盖','derivable']
 ]],
 ['dinh-tap','Định tạp','patterns-dingza.ts',[
  ['风云际会','derivable'],['锦上添花','derivable'],['禄衰马困','derivable'],
  ['衣锦还乡','disputed'],['步数无依','disputed'],['水上驾星','disputed'],
  ['吉凶相伴','disputed'],['枯木逢春','derivable']
 ]]
]);
const GROUPS=Object.freeze(definition.map(([key,name,file,rows])=>{
 const sourceUrl=SOURCE+'/blob/'+SOURCE_COMMIT+'/lib/ziwei/'+file;
 const entries=Object.freeze(rows.map(([title,sourceStatus],index)=>Object.freeze({
  id:key+'-'+String(index+1).padStart(2,'0'),
  title,sourceStatus,sourceUrl,
  scope:key==='dinh-tap'?'period-research':'natal-research'
 })));
 return Object.freeze({key,name,sourceUrl,entries});
}));
const ALL=Object.freeze(GROUPS.flatMap(group=>group.entries));

/** A source classification is not Thiên Đồ's independent evaluation. */
function summarizeClassicalCatalog(assessedIds=[]){
 if(!Array.isArray(assessedIds))throw new TypeError('Expected assessed IDs array');
 const byId=new Map(ALL.map(entry=>[entry.id,entry]));
 const assessed=new Set();
 for(const id of assessedIds){
  const entry=byId.get(id);
  if(!entry||entry.sourceStatus!=='derivable')throw new RangeError('Unrecognized or non-derivable research ID: '+id);
  if(assessed.has(id))throw new RangeError('Duplicate research ID: '+id);
  assessed.add(id);
 }
 const groups=GROUPS.map(group=>Object.freeze({
  key:group.key,name:group.name,sourceUrl:group.sourceUrl,
  total:group.entries.length,
  assessed:group.entries.filter(e=>assessed.has(e.id)).length,
  entries:Object.freeze(group.entries.map(e=>Object.freeze({...e,assessed:assessed.has(e.id)})))
 }));
 const distribution=Object.freeze({
  derivable:ALL.filter(e=>e.sourceStatus==='derivable').length,
  disputed:ALL.filter(e=>e.sourceStatus==='disputed').length,
  unreachable:ALL.filter(e=>e.sourceStatus==='unreachable').length
 });
 return Object.freeze({referenceTotal:ALL.length,assessed:assessed.size,distribution,groups:Object.freeze(groups),
  notice:'Phân loại khả thi/tranh luận/không khả thi do dự án nguồn đề xuất theo hệ quy tắc của họ; Thiên Đồ chưa thẩm định độc lập. Chỉ các mục đã ánh xạ mới được kiểm tra điều kiện trên lá số.'});
}
module.exports=Object.freeze({SOURCE,SOURCE_COMMIT,GROUPS,ALL,summarizeClassicalCatalog});
