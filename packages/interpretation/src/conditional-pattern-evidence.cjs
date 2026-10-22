'use strict';
/**
 * V11.70 — inspect editorial rule conditions, INCLUDING non-matches.
 * Read-only: no star placements, no inferred formations, no annual/natal mixing.
 * A 'matched' record proves only the declared position predicate, never a fortune.
 */
const {assertChart,related}=require('./chart-geometry.cjs');
const {indexNatalStars,locateNatalStar}=require('./natal-star-index.cjs');
const {NATAL_LAYERS}=require('./four-court-evidence.cjs');
const {combinationRules,relationshipPatterns}=require('../../knowledge/src/index.cjs');
const VALID_HOA=new Set(['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ']);
const STRENGTHS={M:'Miếu',V:'Vượng',D:'Đắc',B:'Bình',H:'Hãm'};
const STATUS_SORT={'matched':0,'needs-review':1,'partial':2,'unmet':3};
const REASON={
 absent:'Không thấy trong những lớp sao bản mệnh được hỗ trợ',
 outside:'Sao hiện diện nhưng nằm ngoài phạm vi quy tắc',
 ambiguous:'Một tên sao ở nhiều cung; không thể chọn vị trí duy nhất',
 repeated:'Tên sao bị lặp ở cùng cung trong một lớp hoặc nhiều lớp bản mệnh',
 'focus-required':'Không có sao bắt buộc tọa tại cung đang xét',
 'distinct-required':'Số cung khác nhau chưa đạt điều kiện quy tắc',
 'transformation-absent':'Không có Tứ Hóa năm sinh tương ứng tại cung này',
 'transformation-target':'Sao nhận Hóa không có vị trí bản mệnh duy nhất đúng cung',
 'transformation-conflict':'Cùng một loại Hóa có bản ghi gán đích/vị trí mâu thuẫn'
};
function evidenceForConditionalPatterns(chart,branchIndex){
 assertChart(chart,branchIndex);
 const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
 const focus=byBranch.get(branchIndex),rel=related(branchIndex);
 const four=[branchIndex,...rel.tamHop,rel.doiCung],triad=four.slice(0,3);
 const index=indexNatalStars(chart);
 const natalRepeats=new Set();
 for(const house of chart.houses){
   for(const layer of NATAL_LAYERS){
     const names=Array.isArray(house[layer])?house[layer]:[];
     for(const name of new Set(names)){
       const count=names.filter(x=>x===name).length;
       if(count>1) natalRepeats.add(name);
     }
   }
 }
 // A name repeated across two natal layers at one site also needs review.
 for(const [name,sites] of index){
   for(const layers of sites.values()) if(layers.size>1)natalRepeats.add(name);
 }
 const labels=new Map();
 for(const house of chart.houses) for(const t of (Array.isArray(house.tuHoa)?house.tuHoa:[])){
   if(!t || !VALID_HOA.has(t.name))continue;
   if(!labels.has(t.name))labels.set(t.name,new Set());
   labels.get(t.name).add(JSON.stringify([house.branchIndex,t.star]));
 }
 const positionKind=at=>at===branchIndex?'Tọa cung':rel.tamHop.includes(at)?'Tam hợp':at===rel.doiCung?'Đối cung':'Ngoài Tứ chính';
 const position=(star,at)=>{
   const house=byBranch.get(at);
   const s=Array.isArray(house.mainStarStrengths)?house.mainStarStrengths.filter(x=>x.name===star&&x.branch===at):[];
   const strength=house.stars.includes(star)&&s.length===1&&Object.hasOwn(STRENGTHS,s[0].status)?STRENGTHS[s[0].status]:null;
   const markers=[...new Set((house.obstructionMarkers??[]).filter(x=>x==='Tuần'||x==='Triệt'))];
   return {star,branchIndex:at,palace:house.palace,branch:house.branch,relation:positionKind(at),
     isMainStar:house.stars.includes(star),strength,mainStars:[...house.stars],obstructions:markers};
 };
 const find=(star,allowed)=>{
   const loc=locateNatalStar(index,byBranch,star);
   if(loc.status==='ambiguous')return {star,reason:'ambiguous',positions:loc.branches};
   if(loc.status==='absent')return {star,reason:'absent',positions:[]};
   if(natalRepeats.has(star))return {star,reason:'repeated',positions:loc.branches};
   if(!allowed.includes(loc.branchIndex))return {star,reason:'outside',positions:loc.branches};
   return {star,at:loc.branchIndex,evidence:position(star,loc.branchIndex)};
 };
 const records=[];
 for(const rule of combinationRules){
   const c=rule.conditions,scope=c.scope;
   if(scope==='same-palace'){
     const checks=c.all.map(name=>find(name,[branchIndex]));
     const observed=checks.filter(x=>x.evidence).map(x=>x.evidence);
     const excluded=checks.filter(x=>x.reason).map(x=>({star:x.star,reason:x.reason,detail:REASON[x.reason],positions:x.positions}));
     const needsReview=excluded.some(x=>['ambiguous','repeated'].includes(x.reason));
     records.push({id:rule.id,title:rule.title,kind:'same-palace',scope:'Đồng cung',required:[...c.all],
       status:needsReview?'needs-review':excluded.length===0?'matched':observed.length>0?'partial':'unmet',
       observed,excluded,conditions:[{label:'Đủ sao gốc đồng cung',met:excluded.length===0}],
       interpretation:rule.interpretation,caution:rule.caution,classification:'editorial-position-only'});
   }else if(scope==='natal-transformation'){
     const assignments=[...new Set((focus.tuHoa??[]).filter(t=>t&&t.name===c.name).map(t=>t.star))];
     const conflict=(labels.get(c.name)?.size??0)>1;
     const found=assignments.map(star=>typeof star==='string'?find(star,[branchIndex]):{star:String(star),reason:'transformation-target',positions:[]});
     const valid=!conflict&&found.length===1&&Boolean(found[0].evidence);
     const issues=conflict?[{star:c.name,reason:'transformation-conflict',detail:REASON['transformation-conflict'],positions:[]}]:
       assignments.length===0?[{star:c.name,reason:'transformation-absent',detail:REASON['transformation-absent'],positions:[]}]:
       found.filter(x=>x.reason).map(x=>({star:x.star,reason:'transformation-target',detail:REASON['transformation-target']+` (${REASON[x.reason]})`,positions:x.positions}));
     records.push({id:rule.id,title:rule.title,kind:'natal-transformation',scope:'Tứ Hóa năm sinh',required:[c.name],
       status:conflict?'needs-review':valid?'matched':issues.some(x=>x.reason==='transformation-target')?'needs-review':'unmet',
       observed:valid?[found[0].evidence]:[],excluded:issues,
       conditions:[{label:`${c.name} có đích hợp lệ tại cung`,met:valid},{label:'Không mâu thuẫn định vị Hóa',met:!conflict}],
       interpretation:rule.interpretation,caution:rule.caution,classification:'editorial-position-only'});
   }
 }
 for(const rule of relationshipPatterns){
   const c=rule.conditions;
   if(!Array.isArray(c.all)||!['tam-hop','tu-chinh'].includes(c.scope))continue;
   const allowed=c.scope==='tam-hop'?triad:four;
   const checks=c.all.map(name=>find(name,allowed));
   const observed=checks.filter(x=>x.evidence).map(x=>x.evidence);
   const excluded=checks.filter(x=>x.reason).map(x=>({star:x.star,reason:x.reason,detail:REASON[x.reason],positions:x.positions}));
   const unique=new Set(observed.map(x=>x.branchIndex));
   const focusPresence=observed.some(x=>x.branchIndex===branchIndex);
   const enoughDistinct=unique.size>=c.minDistinctPalaces;
   const anchored=!c.requiresFocusPresence||focusPresence;
   if(!anchored)excluded.push({star:'Điểm neo',reason:'focus-required',detail:REASON['focus-required'],positions:[]});
   if(!enoughDistinct)excluded.push({star:'Phạm vi cung',reason:'distinct-required',detail:`Cần tối thiểu ${c.minDistinctPalaces} cung khác nhau, hiện có ${unique.size}`,positions:[]});
   const needsReview=excluded.some(x=>['ambiguous','repeated'].includes(x.reason));
   records.push({id:rule.id,title:rule.title,kind:'inter-palace',scope:c.scope==='tam-hop'?'Tam hợp':'Tứ chính',required:[...c.all],
     status:needsReview?'needs-review':excluded.length===0?'matched':observed.length>0?'partial':'unmet',
     observed,excluded,conditions:[{label:'Đủ sao bản mệnh thuộc phạm vi',met:checks.every(x=>x.evidence)},
       {label:`Có ít nhất ${c.minDistinctPalaces} cung khác nhau`,met:enoughDistinct},
       {label:c.requiresFocusPresence?'Có sao của bộ tọa tại cung đang xét':'Không yêu cầu sao neo',met:anchored}],
     interpretation:rule.interpretation,caution:rule.caution,classification:'editorial-position-only'});
 }
 records.sort((a,b)=>STATUS_SORT[a.status]-STATUS_SORT[b.status]||a.title.localeCompare(b.title,'vi'));
 return {edition:'11.70.0',scope:'natal-conditional-evidence',anchorBranchIndex:branchIndex,palace:focus.palace,
  assessed:records.length,matched:records.filter(x=>x.status==='matched').length,
  partial:records.filter(x=>x.status==='partial').length,needsReview:records.filter(x=>x.status==='needs-review').length,
  records,expertReviewed:false,
  notice:'Khớp quy tắc chỉ xác nhận vị trí sao theo điều kiện biên tập hiện hỗ trợ; không chứng minh cách cục cổ điển hay dự đoán sự kiện. Không trộn sao lưu, các vòng hạn hoặc Tứ Hóa lưu niên.'};
}
module.exports={evidenceForConditionalPatterns};
