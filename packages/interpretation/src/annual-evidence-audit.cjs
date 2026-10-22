'use strict';
/**
 * V11.45: a read-only quality gate for annual positions. Never generates stars,
 * treats an annual placement as natal, or certifies astrological accuracy.
 */
const {assertChart,related}=require('./chart-geometry.cjs');
const {indexNatalStars,locateNatalStar}=require('./natal-star-index.cjs');
const LABELS=new Set(['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ']);
const validBranch=x=>Number.isInteger(x)&&x>=0&&x<12;
const validText=x=>typeof x==='string'&&x.trim().length>0&&x===x.trim();

function auditAnnualEvidence(chart,annual,anchorBranchIndex){
  assertChart(chart,anchorBranchIndex);
  if(!annual || !Number.isInteger(annual.year)||annual.year<1900||annual.year>2100 ||
    (Number.isInteger(chart.lunar?.year)&&annual.year<chart.lunar.year) ||
    !Array.isArray(annual.luuStars?.items)||!Array.isArray(annual.luuTuHoa?.items) ||
    annual.luuStars.items.length>256||annual.luuTuHoa.items.length>64)
    throw new TypeError('Bản ghi lưu niên chưa hợp lệ hoặc vượt phạm vi hỗ trợ.');
  const houses=new Map(chart.houses.map(h=>[h.branchIndex,h]));
  const rel=related(anchorBranchIndex);
  const scope=new Set([anchorBranchIndex,...rel.tamHop,rel.doiCung]);
  const index=indexNatalStars(chart);
  const relation=at=>at===anchorBranchIndex?'Tọa cung':rel.tamHop.includes(at)?'Tam hợp':at===rel.doiCung?'Đối cung':'Ngoài Tứ chính';
  const baseValid=item=>item&&validText(item.name)&&validBranch(item.branch)&&
    (!Object.hasOwn(item,'palace')||item.palace===houses.get(item.branch).palace);
  const candidates=new Map();
  // Names placed at multiple branches are a conflict. Exact repeats are coalesced.
  for(const item of annual.luuStars.items){
    if(!validText(item?.name))continue;
    if(!candidates.has(item.name))candidates.set(item.name,new Set());
    if(validBranch(item.branch))candidates.get(item.name).add(item.branch);
  }
  const stars=[],rejectedStars=[],seenStars=new Set();
  for(const item of annual.luuStars.items){
    if(!baseValid(item)){
      rejectedStars.push({name:validText(item?.name)?item.name:null,reason:'invalid-annual-placement'});continue;
    }
    if(candidates.get(item.name).size!==1){
      rejectedStars.push({name:item.name,reason:'conflicting-annual-branches'});continue;
    }
    const key=JSON.stringify([item.name,item.branch]);
    if(seenStars.has(key))continue;
    seenStars.add(key);
    stars.push({name:item.name,branchIndex:item.branch,palace:houses.get(item.branch).palace,
      relation:relation(item.branch),inFourCourts:scope.has(item.branch),source:'annual-only'});
  }
  const assignments=new Map();
  for(const item of annual.luuTuHoa.items){
    if(!LABELS.has(item?.name))continue;
    if(!assignments.has(item.name))assignments.set(item.name,new Set());
    assignments.get(item.name).add(JSON.stringify([item.branch,item.star]));
  }
  const transformations=[],rejectedTransformations=[],seenHoa=new Set();
  for(const item of annual.luuTuHoa.items){
    if(!item||!LABELS.has(item.name)||!validText(item.star)||!baseValid(item)){
      rejectedTransformations.push({name:validText(item?.name)?item.name:null,reason:'invalid-transformation'});continue;
    }
    const key=JSON.stringify([item.name,item.star,item.branch]);
    if(seenHoa.has(key))continue;
    seenHoa.add(key);
    if(assignments.get(item.name).size!==1){
      rejectedTransformations.push({name:item.name,reason:'conflicting-transformation-target'});continue;
    }
    const target=locateNatalStar(index,houses,item.star);
    if(target.status!=='observed'||target.branchIndex!==item.branch){
      rejectedTransformations.push({name:item.name,reason:'unverified-natal-target'});continue;
    }
    transformations.push({name:item.name,target:item.star,branchIndex:item.branch,palace:houses.get(item.branch).palace,
      relation:relation(item.branch),inFourCourts:scope.has(item.branch),source:'annual-only'});
  }
  const markers=[];
  for(const [name,at,claimedPalace] of [
    ['Đại hạn',annual.activeDaiHan?.branchIndex,annual.activeDaiHan?.palace],
    ['Tiểu hạn',annual.tieuHan?.branchIndex,annual.tieuHan?.palace],
    ['Lưu Thái Tuế',annual.luuThaiTueBranchIndex,null]
  ]){
    if(at===undefined || at===null)continue;
    if(!validBranch(at)||(claimedPalace!=null&&houses.get(at).palace!==claimedPalace))continue;
    markers.push({name,branchIndex:at,palace:houses.get(at).palace,relation:relation(at),inFourCourts:scope.has(at),source:'annual-only'});
  }
  return {year:annual.year,scope:'annual-evidence-audit',anchorBranchIndex,stars,transformations,
    rejectedStars,rejectedTransformations,markers,
    summary:{validStars:stars.length,validTransformations:transformations.length,
      rejectedStars:rejectedStars.length,rejectedTransformations:rejectedTransformations.length,
      inFourCourts:stars.filter(x=>x.inFourCourts).length},
    methodology:'chỉ kiểm tra tính toàn vẹn và mối liên hệ dữ liệu đã an; không thẩm định công thức trường phái',
    expertReviewed:false};
}
module.exports={auditAnnualEvidence};
