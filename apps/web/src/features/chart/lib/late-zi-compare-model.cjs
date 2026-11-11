'use strict';
/**
 * R38 view-only late-Zi evidence shaping. Never changes persisted birth input.
 * No runtime dependencies; safe to bundle in client components.
 */
const BRANCHES=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
function civilDate(chart){
 const {year,month,day}=chart?.solar||{};
 if(!Number.isInteger(year)||year<1900||year>2100||
  !Number.isInteger(month)||!Number.isInteger(day))throw Error('Ngày dương của lá số không hợp lệ.');
 const iso=[year,String(month).padStart(2,'0'),String(day).padStart(2,'0')].join('-');
 const date=new Date(iso+'T12:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==iso)
  throw Error('Ngày dương của lá số không tồn tại.');
 return iso;
}
function nextCivilDate(chart){
 const date=new Date(civilDate(chart)+'T12:00:00Z');
 date.setUTCDate(date.getUTCDate()+1);
 const next=date.toISOString().slice(0,10);
 return Number(next.slice(0,4))>2100?null:next;
}
function indexChart(chart){
 if(!chart||!Array.isArray(chart.houses)||chart.houses.length!==12)
  throw Error('Cần đủ 12 cung của lá số.');
 const houses=new Map(),stars=new Map();
 for(const house of chart.houses){
  if(!Number.isInteger(house?.branchIndex)||house.branchIndex<0||house.branchIndex>11||
   house.branch!==BRANCHES[house.branchIndex]||!Array.isArray(house.stars)||
   houses.has(house.branchIndex))throw Error('Địa chi bị thiếu hoặc trùng.');
  houses.set(house.branchIndex,house);
  for(const star of house.stars){
   if(typeof star!=='string'||!star||stars.has(star))throw Error('Chính tinh bị lặp.');
   stars.set(star,house.branch);
  }
 }
 if(houses.size!==12||stars.size!==14)throw Error('Bộ 12 cung/14 chính tinh chưa đầy đủ.');
 return {houses,stars};
}
const lunarString=chart=>[chart.lunar?.day,chart.lunar?.month,chart.lunar?.year].join('/')+
 (chart.lunar?.leap?' (nhuận)':'');
function compareChartScenarios(current,alternative){
 if(current?.hour!==23||alternative?.hour!==23||current.gender!==alternative.gender||
   current.minute!==alternative.minute||
   nextCivilDate(current)!==civilDate(alternative))
  throw Error('Hai kịch bản phải cùng giờ 23, phút, giới tính và cách đúng một ngày dương.');
 const a=indexChart(current),b=indexChart(alternative);
 if([...a.stars.keys()].some(name=>!b.stars.has(name)))
  throw Error('Bộ chính tinh giữa hai kịch bản không tương thích.');
 const movedStars=[...a.stars].filter(([star,branch])=>b.stars.get(star)!==branch)
  .map(([name,from])=>({name,from,to:b.stars.get(name)}))
  .sort((x,y)=>x.name.localeCompare(y.name,'vi'));
 const movedSet=new Set(movedStars.map(s=>s.name));
 const branches=BRANCHES.map((branch,index)=>{
  const before=a.houses.get(index),after=b.houses.get(index);
  const beforeNames=before.stars,afterNames=after.stars;
  const contentChanged=before.palace!==after.palace||before.isThan!==after.isThan||
   beforeNames.length!==afterNames.length||
   beforeNames.some(name=>!afterNames.includes(name));
  return {
   branch,branchIndex:index,
   changed:contentChanged,
   before:{palace:before.palace,isThan:before.isThan,mainStars:beforeNames},
   after:{palace:after.palace,isThan:after.isThan,mainStars:afterNames},
   movedBefore:beforeNames.filter(name=>movedSet.has(name)),
   movedAfter:afterNames.filter(name=>movedSet.has(name))
  };
 });
 const fields=[
  {key:'lunar',label:'Ngày âm',before:lunarString(current),after:lunarString(alternative)},
  {key:'menh',label:'Cung Mệnh',before:current.menh,after:alternative.menh},
  {key:'than',label:'Cung Thân',before:current.than,after:alternative.than},
  {key:'cuc',label:'Ngũ hành Cục',before:current.cuc.name,after:alternative.cuc.name},
  {key:'ziwei',label:'Tử Vi',before:a.stars.get('Tử Vi'),after:b.stars.get('Tử Vi')},
  {key:'thienphu',label:'Thiên Phủ',before:a.stars.get('Thiên Phủ'),after:b.stars.get('Thiên Phủ')}
 ].map(row=>({...row,changed:row.before!==row.after}));
 return {
  schema:'thiendo-r38-late-zi-visual-compare-v1',
  currentDate:civilDate(current),alternativeDate:civilDate(alternative),
  clock:'23:'+String(current.minute).padStart(2,'0'),
  branches,fields,movedStars,
  movedCount:movedStars.length,affectedBranches:branches.filter(b=>b.changed).length,
  currentSelected:true,
  hypotheticalOnly:true,writeOperations:false,
  timezoneVerified:false,schoolEquivalenceVerified:false
 };
}
module.exports=Object.freeze({BRANCHES,civilDate,nextCivilDate,indexChart,compareChartScenarios});
