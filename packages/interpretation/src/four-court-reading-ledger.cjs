'use strict';
/**
 * V11.58. Observational reading order for the four courts of a natal palace.
 * Reuses V11.47's evidence validation instead of implementing another rule
 * for locating stars, brightness or Tứ Hóa. Deliberately excludes annual data,
 * fortune scoring and any source-code paths from the public output.
 */
const {assertChart,related}=require('./chart-geometry.cjs');
const {buildPalaceEvidenceLenses}=require('./palace-evidence-lenses.cjs');
const {NATAL_LAYERS}=require('./four-court-evidence.cjs');
const catalog=require('../../knowledge/src/four-court-reading-ledger.json');

const validMarkers=new Set(['Tuần','Triệt']);

function duplicateInLayer(house,star){
 return NATAL_LAYERS.some(field=>Array.isArray(house[field]) && house[field].filter(x=>x===star).length>1);
}
function readCourt(chart,house,relation){
 const audit=buildPalaceEvidenceLenses(chart,house.branchIndex);
 const issues=[];
 const groups={main:[],support:[],challenge:[],transformation:[],obstruction:[]};
 for(const lens of audit.lenses){
  for(const finding of lens.problems){
   // A known unverified brightness must not be presented as a verified star.
   issues.push({category:lens.id,star:finding.star,reason:
    lens.id==='main'&&finding.strengthStatus==='unverified'?'Độ sáng chính tinh chưa được xác minh':
    lens.id==='transformation'?'Nhãn Tứ Hóa hoặc sao đích chưa xác minh':'Vị trí hoặc lớp sao không duy nhất/hợp lệ'});
  }
  for(const item of lens.observed){
   if(lens.id==='main'&&item.strengthStatus!=='verified')continue;
   if(lens.id==='transformation'&&!item.targetPath) {
    issues.push({category:lens.id,star:item.star,reason:'Không có đường dẫn chứng cứ đến sao đích'});
    continue;
   }
   if(duplicateInLayer(house,item.star)){
    issues.push({category:lens.id,star:item.star,reason:'Tên sao lặp trong cùng một lớp tại một cung'});
    continue;
   }
   groups[lens.id].push(lens.id==='transformation'?{
    star:item.star,transformation:item.transformation,branchIndex:house.branchIndex
   }:{star:item.star,branchIndex:house.branchIndex,...(lens.id==='main'?{strength:item.strength}:{})});
  }
 }
 const markers=Array.isArray(house.obstructionMarkers)?house.obstructionMarkers:[];
 for(const marker of new Set(markers)) {
  if(!validMarkers.has(marker)){
   issues.push({category:'obstruction',star:String(marker),reason:'Dấu án ngữ không nằm trong bộ được nhận diện'});
  }else if(markers.filter(name=>name===marker).length>1){
   issues.push({category:'obstruction',star:marker,reason:'Dấu án ngữ bị lặp trong cùng một cung'});
  }else groups.obstruction.push({star:marker,branchIndex:house.branchIndex});
 }
 const total=Object.values(groups).reduce((sum,items)=>sum+items.length,0);
 return {palace:house.palace,branch:house.branch,branchIndex:house.branchIndex,
  relation,mainStarCount:Array.isArray(house.stars)?new Set(house.stars).size:0,
  // This means no main star *was placed*, not that a main star was unverified.
  isVoChinhDieu:house.stars.length===0,
  groups,issues,status:issues.length?'needs-review':total?'observed':'no-data'};
}
function buildFourCourtReadingLedger(chart,branchIndex){
 assertChart(chart,branchIndex);
 const houses=new Map(chart.houses.map(h=>[h.branchIndex,h]));
 const focus=houses.get(branchIndex);
 const profile=Object.hasOwn(catalog.profiles,focus.palace)?catalog.profiles[focus.palace]:null;
 if(!profile)return {status:'unavailable',palace:focus.palace,expertReviewed:false,courts:[],questions:[],notice:'Chưa có hồ sơ đọc cung này.'};
 const r=related(branchIndex);
 const positions=[{at:branchIndex,relation:'tọa cung'},...r.tamHop.map(at=>({at,relation:'tam hợp'})),{at:r.doiCung,relation:'đối cung'}];
 const courts=positions.map(({at,relation})=>readCourt(chart,houses.get(at),relation));
 const raw=(field,subset=courts)=>subset.flatMap(c=>c.groups[field].map(x=>({...x,palace:c.palace,branch:c.branch,relation:c.relation})));
 const allIssues=courts.flatMap(c=>c.issues.map(issue=>({...issue,palace:c.palace,branch:c.branch,relation:c.relation})));
 const focusCourt=courts[0],relatedCourts=courts.slice(1,3),opposite=courts[3];
 const records=[
  {id:'toa-cung',title:'Đọc chính tinh tọa cung',question:profile.localQuestion,
   evidence:raw('main',[focusCourt]),issues:focusCourt.issues,
   missing:focusCourt.isVoChinhDieu?['Cung vô chính diệu: cần xét đối cung, không mượn sao như thể tọa thủ.']:
    !focusCourt.groups.main.length?['Chính tinh có mặt nhưng chưa đủ chứng cứ độ sáng hoặc vị trí.']:[]},
  {id:'tam-hop',title:'Đối chiếu hai cung tam hợp',question:profile.tamHopQuestion,
   evidence:[...raw('main',relatedCourts),...raw('support',relatedCourts),...raw('challenge',relatedCourts)],
   issues:relatedCourts.flatMap(c=>c.issues),missing:[]},
  {id:'doi-cung',title:'Đối chiếu cung xung chiếu',question:profile.oppositionQuestion,
   evidence:[...raw('main',[opposite]),...raw('support',[opposite]),...raw('challenge',[opposite])],
   issues:opposite.issues,missing:[]},
  {id:'cross-signals',title:'Kiểm tra yếu tố cần đối chiếu',
   question:'Sát tinh và dấu Tuần/Triệt ở những cung nào trong tứ chính? Từng vị trí được đặt ra để khảo sát, không cộng thành điểm hung.',
   evidence:[...raw('challenge'),...raw('obstruction')],issues:allIssues.filter(x=>x.category==='challenge'||x.category==='obstruction'),missing:[]},
  {id:'natal-hoa',title:'Theo dấu Tứ Hóa năm sinh',
   question:'Nhãn Hóa nào gắn với sao đích đã kiểm tra ở tứ chính? Sao lưu theo năm xem phải được khảo sát ở lớp riêng.',
   evidence:raw('transformation'),issues:allIssues.filter(x=>x.category==='transformation'),missing:[]}
 ];
 for(const record of records){
  record.status=record.issues.length?'needs-review':record.evidence.length?'observed':'no-data';
  record.expertReviewed=false;
  record.evidence=record.evidence.map(item=>{const {sourcePath,strengthPath,targetPath,...safe}=item;return safe;});
 }
 const totalEvidence=Object.values(courts[0].groups).reduce((sum,x)=>sum+x.length,0);
 return {status:'research-only',edition:catalog.edition,scope:catalog.scope,expertReviewed:false,
  palace:focus.palace,branch:focus.branch,anchorBranchIndex:branchIndex,
  // Counts are observations, explicitly NOT weights, scoring or a judgment of auspiciousness.
  summary:{courtCount:4,observedEntries:courts.reduce((sum,c)=>sum+Object.values(c.groups).reduce((a,x)=>a+x.length,0),0),
   localEntries:totalEvidence,issues:allIssues.length,validNatalTransformations:raw('transformation').length,
   focusIsVoChinhDieu:focusCourt.isVoChinhDieu},
  courts,questions:records,notice:catalog.notice};
}
module.exports={buildFourCourtReadingLedger};
