'use strict';
/** V11.49 evidence-only relations across natal houses, NOT a placement or prediction engine. */
const {assertChart,related}=require('./chart-geometry.cjs');
const {indexNatalStars,locateNatalStar}=require('./natal-star-index.cjs');
const {NATAL_LAYERS}=require('./four-court-evidence.cjs');
const catalog=require('../../knowledge/src/palace-relational-synthesis.json');

const SUPPORT=new Set(['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Lộc Tồn','Thiên Mã','Thiên Quan','Thiên Phúc']);
const CHALLENGE=new Set(['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp']);
const STRENGTHS=new Set(['M','V','D','B','H']);
const SECONDARY_LAYERS=NATAL_LAYERS.filter(layer=>layer!=='stars');
const FLANK_STARS=new Set(catalog.eligibleFlankPairs.flat());
function provenance(chart,house,star,layer){
 const chartIndex=chart.houses.indexOf(house);
 const at=Array.isArray(house[layer])?house[layer].indexOf(star):-1;
 return at<0?null:`houses[${chartIndex}].${layer}[${at}]`;
}
function inspect(chart,index,house,star,kind){
 const byBranch=new Map(chart.houses.map(item=>[item.branchIndex,item]));
 const located=locateNatalStar(index,byBranch,star);
 const layers=kind==='chính tinh'?['stars']:SECONDARY_LAYERS;
 const occurrences=layers.flatMap(layer=>(Array.isArray(house[layer])?house[layer]:[])
  .filter(name=>name===star).map(()=>layer));
 const actual=kind==='chính tinh'?located.layers?.includes('stars'):
  located.layers?.some(layer=>SECONDARY_LAYERS.includes(layer))&&!located.layers?.includes('stars');
 if(located.status!=='observed'||located.branchIndex!==house.branchIndex||!actual||occurrences.length!==1){
  return {problem:`${star}: vị trí hoặc lớp sao bản mệnh chưa duy nhất/hợp lệ tại ${house.palace} (${house.branch}).`};
 }
 const layer=occurrences[0],sourcePath=provenance(chart,house,star,layer);
 if(!sourcePath)return {problem:`${star}: không tìm được bản ghi nguồn tại ${house.palace}.`};
 const item={star,kind,scope:'natal',palace:house.palace,branch:house.branch,branchIndex:house.branchIndex,sourcePath};
 if(kind!=='chính tinh')return {item};
 const strengths=Array.isArray(house.mainStarStrengths)?house.mainStarStrengths:[];
 const matches=strengths.map((value,i)=>({value,i})).filter(({value})=>value?.name===star&&value.branch===house.branchIndex);
 if(matches.length!==1||!STRENGTHS.has(matches[0].value.status))return {problem:`${star}: độ sáng chưa hợp lệ/duy nhất tại ${house.palace}.`};
 return {item:{...item,strength:matches[0].value.status,strengthPath:`houses[${chart.houses.indexOf(house)}].mainStarStrengths[${matches[0].i}]`}};
}
function collect(chart,index,house,kind,allowed){
 const layers=kind==='chính tinh'?['stars']:SECONDARY_LAYERS;
 const names=[...new Set(layers.flatMap(layer=>Array.isArray(house[layer])?house[layer]:[])
  .filter(name=>typeof name==='string'&&allowed(name)))];
 const evidence=[],issues=[];
 for(const star of names){const finding=inspect(chart,index,house,star,kind);
  if(finding.problem)issues.push(finding.problem);
  else evidence.push(finding.item);
 }
 return {evidence,issues,names};
}
function classify(evidence,issues,complete){
 if(issues.length)return 'needs-review';
 if(complete)return 'observed';
 return evidence.length?'partial':'no-data';
}
function buildPalaceRelationalSynthesis(chart,branchIndex){
 assertChart(chart,branchIndex);
 const houses=new Map(chart.houses.map(h=>[h.branchIndex,h])),focus=houses.get(branchIndex);
 const profile=Object.hasOwn(catalog.profiles,focus.palace)?catalog.profiles[focus.palace]:null;
 if(!profile)return {status:'unavailable',palace:focus.palace,expertReviewed:false,records:[],notice:'Chưa có bài tập đối chiếu quan hệ cung.'};
 const index=indexNatalStars(chart),rel=related(branchIndex),main=collect(chart,index,focus,'chính tinh',()=>true);
 const records=[];
 const row=(def,evidence,issues,conditions,missing,meta={})=>{
  const complete=conditions.every(c=>c.met===true);
  const status=classify(evidence,issues,complete);
  return {id:def.id,title:def.title,question:profile[def.id],status,
   condition:def.scope,checks:conditions,evidence,missing:[...new Set([...missing,...issues])],
   expertReviewed:false,...meta};
 };
 for(const def of catalog.patterns){
  if(def.id==='tam-hop'){
   const linked=[],issues=[...main.issues];
   for(const at of rel.tamHop){
    const house=houses.get(at);
    for(const [kind,allowed] of [['sao trợ lực',star=>SUPPORT.has(star)],['sát tinh',star=>CHALLENGE.has(star)]]){
     const group=collect(chart,index,house,kind,allowed);
     issues.push(...group.issues);
     linked.push(...group.evidence.map(item=>({...item,relation:'tam-hop'})));
    }
   }
   const mainClean=main.issues.length===0;
   records.push(row(def,[...main.evidence.map(item=>({...item,relation:'tọa cung'})),...linked],issues,
    [{label:'Chính tinh tọa cung có bản ghi hợp lệ hoặc cung vô chính diệu',met:mainClean},
     {label:'Có sao bản mệnh thuộc nhóm nghiên cứu ở ít nhất một cung tam hợp',met:linked.length>0}],
    linked.length?[]:['Chưa quan sát được sao thuộc nhóm khảo sát tại hai cung tam hợp.'],
    {relatedBranches:rel.tamHop}));
  }else if(def.id==='doi-cung'){
   const opp=houses.get(rel.doiCung),other=collect(chart,index,opp,'chính tinh',()=>true);
   const issues=[...main.issues,...other.issues];
   const evidence=[...main.evidence.map(item=>({...item,relation:'tọa cung'})),
    ...other.evidence.map(item=>({...item,relation:'đối cung'}))];
   records.push(row(def,evidence,issues,
    [{label:'Chính tinh tại cung đang xem đã xác minh (hoặc vô chính diệu)',met:main.issues.length===0},
     {label:'Có chính tinh tại đối cung với độ sáng hợp lệ',met:other.evidence.length>0}],
    other.evidence.length?[]:['Không có chính tinh đã xác minh ở đối cung.'],
    {focusIsVoChinhDieu:main.names.length===0,relatedBranches:[rel.doiCung]}));
  }else if(def.id==='giap-cung'){
   // Only a recognized complementary pair split across the two IMMEDIATE neighbors counts.
   // A pair in the same neighbor, or in a trinal house, does not satisfy giáp cung.
   const before=(branchIndex+11)%12,after=(branchIndex+1)%12;
   const left=collect(chart,index,houses.get(before),'sao trợ lực',name=>FLANK_STARS.has(name));
   const right=collect(chart,index,houses.get(after),'sao trợ lực',name=>FLANK_STARS.has(name));
   const matchedPairs=catalog.eligibleFlankPairs.filter(([a,b])=>(left.evidence.some(x=>x.star===a)&&right.evidence.some(x=>x.star===b))||
    (left.evidence.some(x=>x.star===b)&&right.evidence.some(x=>x.star===a)));
   const evidence=[...left.evidence.map(item=>({...item,relation:'giáp cung',side:'trước'})),
    ...right.evidence.map(item=>({...item,relation:'giáp cung',side:'sau'}))];
   const issues=[...left.issues,...right.issues];
   records.push(row(def,evidence,issues,
    [{label:'Có sao thuộc các cặp đã khai báo ở cung giáp phía trước',met:left.evidence.length>0},
     {label:'Có sao thuộc các cặp đã khai báo ở cung giáp phía sau',met:right.evidence.length>0},
     {label:'Ít nhất một cặp có đúng mỗi sao ở một cung giáp khác nhau',met:matchedPairs.length>0}],
    matchedPairs.length?[]:['Chưa quan sát được một cặp sao bổ trợ hợp lệ đứng tại hai phía giáp cung.'],
    {matchedPairs:matchedPairs.map(pair=>[...pair]),relatedBranches:[before,after]}));
  }else throw new Error(`Quan hệ nghiên cứu chưa hỗ trợ: ${def.id}`);
 }
 return {status:'research-only',scope:catalog.scope,edition:catalog.edition,expertReviewed:false,
  palace:focus.palace,branch:focus.branch,records,notice:catalog.notice};
}
module.exports={buildPalaceRelationalSynthesis};
