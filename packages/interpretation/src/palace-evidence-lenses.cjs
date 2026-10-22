'use strict';
/** V11.47: per-palace research observations. Never calculates placements or predicts outcomes. */
const {assertChart}=require('./chart-geometry.cjs');
const {indexNatalStars,locateNatalStar}=require('./natal-star-index.cjs');
const {NATAL_LAYERS}=require('./four-court-evidence.cjs');
const catalogue=require('../../knowledge/src/palace-evidence-lenses.json');

const SUPPORT=new Set(['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Lộc Tồn','Thiên Mã','Thiên Quan','Thiên Phúc']);
const CHALLENGE=new Set(['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp']);
const HOAS=new Set(['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ']);
const STRENGTHS=new Set(['M','V','D','B','H']);
const lensList=[
  {id:'main',title:'Chính tinh và độ sáng'},
  {id:'support',title:'Sao trợ lực theo tài liệu nghiên cứu'},
  {id:'challenge',title:'Sát tinh cần đối chiếu'},
  {id:'transformation',title:'Tứ Hóa năm sinh và sao đích'}
];
function buildPalaceEvidenceLenses(chart,branchIndex){
  assertChart(chart,branchIndex);
  const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
  const focus=byBranch.get(branchIndex);
  const profile=Object.hasOwn(catalogue.profiles,focus.palace)?catalogue.profiles[focus.palace]:null;
  if(!profile)return {status:'unavailable',palace:focus.palace,expertReviewed:false,lenses:[],notice:'Chưa biên soạn hồ sơ cho cung này.'};
  const index=indexNatalStars(chart);
  const chartIndex=chart.houses.indexOf(focus);
  const place=(star,layer)=>{
    const recorded=focus[layer];
    const at=Array.isArray(recorded)?recorded.indexOf(star):-1;
    return at<0?null:`houses[${chartIndex}].${layer}[${at}]`;
  };
  const sourceFor=(name)=>{
    for(const field of NATAL_LAYERS){const p=place(name,field);if(p)return {field,path:p};}
    return null;
  };
  const normalized=(name,kind)=>{
    const found=locateNatalStar(index,byBranch,name);
    if(found.status!=='observed'||found.branchIndex!==branchIndex)return {star:name,status:found.status==='ambiguous'?'ambiguous':'not-local',kind,sourcePath:null};
    const source=sourceFor(name);
    return {star:name,status:source?'observed':'missing-source',kind,sourcePath:source?.path??null,
      layer:source?.field??null,branchIndex,branch:focus.branch,palace:focus.palace};
  };
  const allLocal=new Set();
  for(const layer of NATAL_LAYERS)for(const name of Array.isArray(focus[layer])?focus[layer]:[])
    if(typeof name==='string'&&name.trim())allLocal.add(name);
  const localMain=[...new Set((focus.stars??[]).filter(s=>typeof s==='string'&&s.trim()))];
  const main=localMain.map(name=>{
    const item=normalized(name,'main');
    if(item.status!=='observed')return item;
    const strengths=Array.isArray(focus.mainStarStrengths)?focus.mainStarStrengths:[];
    const same=strengths.map((value,i)=>({value,i})).filter(({value})=>value?.name===name&&value.branch===branchIndex);
    if(same.length!==1||!STRENGTHS.has(same[0].value.status))return {...item,strength:null,strengthStatus:'unverified'};
    return {...item,strength:same[0].value.status,strengthStatus:'verified',strengthPath:`houses[${chartIndex}].mainStarStrengths[${same[0].i}]`};
  });
  const support=[...allLocal].filter(s=>SUPPORT.has(s)).map(s=>normalized(s,'support'));
  const challenge=[...allLocal].filter(s=>CHALLENGE.has(s)).map(s=>normalized(s,'challenge'));
  // Each transformation label may have only one target+branch across the chart.
  const labelTargets=new Map();
  for(const house of chart.houses)for(const item of Array.isArray(house.tuHoa)?house.tuHoa:[]){
    if(!HOAS.has(item?.name))continue;
    if(!labelTargets.has(item.name))labelTargets.set(item.name,new Set());
    labelTargets.get(item.name).add(JSON.stringify([house.branchIndex,item.star]));
  }
  const transformation=[];
  const seen=new Set();
  for(const [i,item] of (Array.isArray(focus.tuHoa)?focus.tuHoa:[]).entries()){
    if(!HOAS.has(item?.name)){
      transformation.push({star:typeof item?.star==='string'?item.star:'Không rõ',transformation:typeof item?.name==='string'?item.name:'Không rõ',
        status:'invalid-label',kind:'transformation',sourcePath:`houses[${chartIndex}].tuHoa[${i}]`});continue;
    }
    const key=JSON.stringify([item.name,item.star]);if(seen.has(key))continue;seen.add(key);
    const found=typeof item.star==='string'?locateNatalStar(index,byBranch,item.star):{status:'absent'};
    const valid=labelTargets.get(item.name)?.size===1&&found.status==='observed'&&found.branchIndex===branchIndex;
    transformation.push({star:typeof item.star==='string'?item.star:'Không rõ',transformation:item.name,
      status:valid?'observed':'unverified-target',kind:'transformation',sourcePath:`houses[${chartIndex}].tuHoa[${i}]`,
      ...(valid?{targetPath:sourceFor(item.star)?.path??null,branchIndex,branch:focus.branch,palace:focus.palace}:{})});
  }
  const items={main,support,challenge,transformation};
  const lenses=lensList.map(({id,title})=>{
    const records=items[id];
    const problems=records.filter(item=>item.status!=='observed'||(id==='main'&&item.strengthStatus==='unverified'));
    const observed=records.filter(item=>item.status==='observed');
    return {id,title,question:profile[id],status:problems.length?'needs-review':observed.length?'observed':'no-data',
      observed,problems,observedCount:observed.length,problemCount:problems.length};
  });
  return {status:'research-only',palace:focus.palace,branch:focus.branch,edition:catalogue.edition,expertReviewed:false,
    lenses,notice:catalogue.notice};
}
module.exports={buildPalaceEvidenceLenses};
