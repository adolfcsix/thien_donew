'use strict';
/** V11.43: descriptive 3/4-star position study, never a classical-formation rule. */
const {assertChart,related}=require('./chart-geometry.cjs');
const {indexNatalStars,locateNatalStar}=require('./natal-star-index.cjs');
const {auditAnnualEvidence}=require('./annual-evidence-audit.cjs');
const library=require('../../knowledge/src/natal-multi-star-research.json');
const {buildConditionalStarGroupGuides}=require('./conditional-star-group-guides.cjs');
const HOA=new Set(['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ']);
function examineNatalMultiStars(chart,anchorBranchIndex,{annual=null,includeAnnual=false}={}){
 assertChart(chart,anchorBranchIndex);
 const houses=new Map(chart.houses.map(h=>[h.branchIndex,h]));
 const rel=related(anchorBranchIndex),scope=[anchorBranchIndex,...rel.tamHop,rel.doiCung];
 const scopeSet=new Set(scope),index=indexNatalStars(chart);
 const findings=library.groups.map(group=>{
   const placements=group.stars.map(star=>{
     const found=locateNatalStar(index,houses,star);
     if(found.status!=='observed')return {...found,inFourCourts:false};
     return {...found,inFourCourts:scopeSet.has(found.branchIndex),
       relation:found.branchIndex===anchorBranchIndex?'Tọa cung':rel.tamHop.includes(found.branchIndex)?'Tam hợp':scopeSet.has(found.branchIndex)?'Đối cung':'Ngoài Tứ chính',
       accompanyingMainStars:[...houses.get(found.branchIndex).stars]};
   });
   const ambiguous=placements.some(p=>p.status==='ambiguous');
   const observed=placements.filter(p=>p.status==='observed'&&p.inFourCourts);
   const status=ambiguous?'ambiguous':observed.length===placements.length?'all-observed':observed.length>=2?'partial':'insufficient';
   return {id:group.id,title:group.title,category:group.category,question:group.question,nextStep:group.nextStep,
     stars:[...group.stars],status,required:placements.length,observed:observed.length,placements,
     classification:'positional-study-only',expertReviewed:false};
 });
 // Birth transformations are validated against a UNIQUE original-star position and
 // a UNIQUE (label,target,branch) assignment. Duplicate identical records are harmless.
 const assignment=new Map();
 for(const h of chart.houses)for(const hoa of Array.isArray(h.tuHoa)?h.tuHoa:[]){
  if(!hoa||!HOA.has(hoa.name))continue;
  if(!assignment.has(hoa.name))assignment.set(hoa.name,new Set());
  assignment.get(hoa.name).add(JSON.stringify([h.branchIndex,hoa.star]));
 }
 const transformations=[];const rejectedTransformations=[];const seen=new Set();
 for(const h of chart.houses){
  for(const hoa of Array.isArray(h.tuHoa)?h.tuHoa:[]){
   if(!hoa||!HOA.has(hoa.name))continue;
   const key=JSON.stringify([h.branchIndex,hoa.name,hoa.star]);
   if(seen.has(key))continue;seen.add(key);
   const target=typeof hoa.star==='string'?locateNatalStar(index,houses,hoa.star):null;
   const valid=assignment.get(hoa.name).size===1&&target?.status==='observed'&&target.branchIndex===h.branchIndex&&scopeSet.has(h.branchIndex);
   const record={name:hoa.name,target:typeof hoa.star==='string'?hoa.star:null,
     branchIndex:h.branchIndex,palace:h.palace,relation:scopeSet.has(h.branchIndex)?h.branchIndex===anchorBranchIndex?'Tọa cung':rel.tamHop.includes(h.branchIndex)?'Tam hợp':'Đối cung':'Ngoài Tứ chính',
     status:valid?'verified-natal-target':'unverified-target'};
   (valid?transformations:rejectedTransformations).push(record);
  }
 }
 const annualValid=includeAnnual && Number.isInteger(annual?.year) && Array.isArray(annual?.luuStars?.items) && Array.isArray(annual?.luuTuHoa?.items);
 const auditedAnnual=annualValid?auditAnnualEvidence(chart,annual,anchorBranchIndex):null;
 const annualOverlay=auditedAnnual?{year:auditedAnnual.year,scope:'annual-only',
   stars:auditedAnnual.stars.filter(x=>x.inFourCourts).map(x=>({name:x.name,branchIndex:x.branchIndex,palace:x.palace})),
   transformations:auditedAnnual.transformations.filter(x=>x.inFourCourts).map(x=>({name:x.name,target:x.target,branchIndex:x.branchIndex,palace:x.palace})),
   notice:'Chỉ các vị trí lưu niên vượt qua kiểm tra cấu trúc được hiển thị; không ghép vào sao gốc và không xác nhận công thức theo trường phái.'}:null;
 return {edition:library.edition,scope:'natal-multi-star-study',anchorBranchIndex,
   assessed:findings.length,allObserved:findings.filter(r=>r.status==='all-observed').length,
   partial:findings.filter(r=>r.status==='partial').length,ambiguous:findings.filter(r=>r.status==='ambiguous').length,
   records:findings,conditionalGuides:buildConditionalStarGroupGuides(chart,anchorBranchIndex,findings),
   transformations,rejectedTransformations,annualOverlay,
   expertReviewed:false,notice:library.notice};
}
module.exports={examineNatalMultiStars};
