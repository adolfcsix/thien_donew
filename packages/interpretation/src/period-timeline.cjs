'use strict';
/**
 * THIÊN ĐỒ V11.20: audited annual period-comparison presentation.
 * Read-only. This module NEVER places new stars, invents a lunar-month method,
 * or makes favorable/unfavorable predictions. Every position is obtained from
 * the versioned Astrology Engine's annualOverview() for the requested year.
 */
const Engine = require('../../astrology-engine/src/tuvi.js');
const DeepGuide = require('../../knowledge/src/annual-palace-deep-reading-v111494.json');
const {buildPeriodEvidence}=require('./period-evidence-v111495.cjs');
const RULESET = 'thiendo-annual-timeline-v11.20';
const MAX_YEAR = 2100;
const MIN_YEAR = 1900;
const RANGE = 12;
const NATAL_FIELDS=Object.freeze([
 ['stars','Chính tinh'], ['auxiliaryStars','Phụ tinh cơ bản'],['yearStars','Sao theo chi năm sinh'],
 ['additionalStars','Sao theo tháng/ngày'],['advancedStars','Sát tinh theo giờ/chi'],
 ['traditionalStars','Phụ tinh truyền thống'],['natalExtensionStars','Phụ tinh mở rộng'],
 ['beneficStars','Đức/Giải'],['positionalStars','Sao định vị'],
 ['missingStars','Sao bổ sung'],['derivedStars','Sao phái sinh']
]);
const CYCLE_FIELDS=Object.freeze([
 ['thaiTue','Vòng Thái Tuế'],['bacSi','Vòng Bác Sĩ'],['trangSinh','Vòng Tràng Sinh']
]);
function verifiedNames(input){
 return Array.isArray(input)?input.filter(n=>typeof n==='string'&&n.trim().length>0):[];
}
function natalByLayer(house){
 const groups=NATAL_FIELDS.map(([key,label])=>({key,label,names:verifiedNames(house[key])}));
 const cycles=CYCLE_FIELDS.map(([key,label])=>({key,label,names:verifiedNames(house.cycleStars?.[key])}));
 return {groups,cycles,count:[...groups,...cycles].reduce((n,g)=>n+g.names.length,0)};
}
function periodQuestions(palace,labels){
 const entry=DeepGuide.palaces[palace];
 if(!entry) throw new Error('Chưa có hồ sơ câu hỏi vận hạn cho cung '+palace);
 const lookups={'Đại hạn':'daiHan','Tiểu hạn':'tieuHan','Lưu Thái Tuế':'luuThaiTue'};
 return labels.map(label=>({label,text:entry[lookups[label]]}));
}


function assertChart(chart) {
  if (!chart || !Number.isInteger(chart.lunar?.year) || chart.lunar.year < MIN_YEAR || chart.lunar.year > MAX_YEAR ||
      !Array.isArray(chart.houses) || chart.houses.length !== 12 ||
      new Set(chart.houses.map(h => h.branchIndex)).size !== 12 ||
      !chart.houses.every(h => Number.isInteger(h.branchIndex) && h.branchIndex >= 0 && h.branchIndex < 12 && typeof h.palace === 'string')) {
    throw new TypeError('Cần lá số hợp lệ với 12 cung và năm sinh âm lịch');
  }
}
function assertYear(chart, year) {
  if (!Number.isInteger(year) || year < chart.lunar.year || year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError('Năm xem phải là năm âm lịch từ năm sinh đến 2100');
  }
}
function conciseYear(annual) {
  const points = [
    ...(annual.activeDaiHan ? [{kind:'dai-han', branchIndex:annual.activeDaiHan.branchIndex, palace:annual.activeDaiHan.palace}] : []),
    {kind:'tieu-han',branchIndex:annual.tieuHan.branchIndex,palace:annual.tieuHan.palace},
    {kind:'luu-thai-tue',branchIndex:annual.luuThaiTueBranchIndex,palace:null}
  ];
  const matched = [];
  const categories=[['dai-han','Đại hạn'],['tieu-han','Tiểu hạn'],['luu-thai-tue','Lưu Thái Tuế']];
  for(let i=0;i<categories.length;i++)for(let j=i+1;j<categories.length;j++){
    const first=points.find(x=>x.kind===categories[i][0]);
    const second=points.find(x=>x.kind===categories[j][0]);
    if(first && second && first.branchIndex===second.branchIndex) matched.push({branchIndex:first.branchIndex,label:`${categories[i][1]} và ${categories[j][1]} cùng cung`});
  }
  return {
    year:annual.year, canChi:annual.canChi, ageMu:annual.ageMu,
    daiHan:annual.activeDaiHan ? {branchIndex:annual.activeDaiHan.branchIndex,palace:annual.activeDaiHan.palace,fromAge:annual.activeDaiHan.fromAge,toAge:annual.activeDaiHan.toAge} : null,
    tieuHan:{branchIndex:annual.tieuHan.branchIndex,palace:annual.tieuHan.palace,branch:annual.tieuHan.branch},
    luuThaiTue:{branchIndex:annual.luuThaiTueBranchIndex,branch:annual.luuThaiTueBranch},
    annualStarCount:annual.luuStars.items.length, annualTransformationCount:annual.luuTuHoa.items.length,
    overlaps:matched
  };
}
function comparePeriods(chart, selectedYear, range=RANGE) {
  assertChart(chart);
  assertYear(chart,selectedYear);
  if(!Number.isInteger(range)||range<1||range>24) throw new RangeError('Phạm vi phải từ 1 đến 24 năm');
  const earliest=Math.max(MIN_YEAR,chart.lunar.year);
  const start=Math.min(Math.max(earliest,selectedYear-Math.floor((range-1)/2)),Math.max(earliest,MAX_YEAR-range+1));
  const end=Math.min(MAX_YEAR,start+range-1);
  const years=[];
  let selectedAnnual;
  for(let year=start;year<=end;year++) {
    const annual=Engine.annualOverview(chart,year);
    years.push(conciseYear(annual));
    if(year===selectedYear)selectedAnnual=annual;
  }
  if(!selectedAnnual)throw new Error('Năm đang chọn bị loại khỏi phạm vi đối chiếu');
  const evidence=buildPeriodEvidence(chart,selectedAnnual);
  const houses=[...chart.houses].sort((a,b)=>a.branchIndex-b.branchIndex);
  const selectedHouses=houses.map(house=>{
    const branchIndex=house.branchIndex;
    const labels=[];
    if(selectedAnnual.activeDaiHan?.branchIndex===branchIndex) labels.push('Đại hạn');
    if(selectedAnnual.tieuHan.branchIndex===branchIndex) labels.push('Tiểu hạn');
    if(selectedAnnual.luuThaiTueBranchIndex===branchIndex) labels.push('Lưu Thái Tuế');
    const annualStars=selectedAnnual.luuStars.items.filter(s=>s.branch===branchIndex).map(s=>s.name);
    const natal=natalByLayer(house);
    const annualStudy=annualStars.map(name=>{
      const study=DeepGuide.annualStars[name];
      if(!study) throw new Error('Thiếu hồ sơ sao lưu đang an: '+name);
      return {name,theme:study.theme,question:study.question,expertReviewed:false};
    });
    const annualTransformations=selectedAnnual.luuTuHoa.items.filter(s=>s.branch===branchIndex).map(s=>({name:s.name,star:s.star}));
    const annualEvidence=evidence.entries.filter(e=>e.branchIndex===branchIndex);
    return {branchIndex,branch:house.branch,palace:house.palace,labels,annualStars,annualTransformations,
      natalStarCount:natal.count,natalGroups:natal.groups.filter(g=>g.names.length),
      natalCycles:natal.cycles.filter(g=>g.names.length),
      annualStudy,periodQuestions:periodQuestions(house.palace,labels),annualEvidence,
      editorialReviewed:false};
  });
  return {
    ruleSet:RULESET,
    selectedYear,
    birthLunarYear:chart.lunar.year,
    years,
    selected:conciseYear(selectedAnnual),
    houses:selectedHouses,annualTrace:{method:evidence.method,selectedLunarYear:evidence.selectedLunarYear,yearStem:evidence.yearStem,
      yearBranch:evidence.yearBranch,counts:evidence.counts,researchOnly:true,expertReviewed:false},
    natalInventory:{placedNameOccurrences:selectedHouses.reduce((n,h)=>n+h.natalStarCount,0),
      layersSeparate:true,expectedBaselineNameCount:104,fullStarSchoolCoverageVerified:false},
    editorial:{edition:DeepGuide.edition,expertReviewed:false,schoolVerified:false,
      description:'36 câu hỏi theo 12 cung/3 lớp hạn và 12 hồ sơ sao lưu; chỉ hiện nếu vị trí có thật trên lá số.'},
    coverage:{daiHan:true,tieuHan:true,luuThaiTue:true,annualStars:12,annualTransformations:4,luuNguyet:false,luuNhat:false,luuThoi:false,fullLuuNien:false},
    explanation:'Đối chiếu vị trí các lớp vận hạn theo từng năm âm lịch. Đây là thông tin nghiên cứu, không phải dự báo biến cố.',
    limitation:'Chưa có phép an Lưu nguyệt, Lưu nhật, Lưu thời được kiểm chứng. Không suy ra cát/hung từ việc nhiều dấu cùng cung.'
  };
}
module.exports=Object.freeze({RULESET,comparePeriods});
