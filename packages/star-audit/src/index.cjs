'use strict';
/**
 * V11.15 static, auditable inventory built from the ACTUAL star output.
 * The report is a developer artifact; it is never imported by user-facing UI.
 * It measures internal implementation coverage, not correctness of metaphysics.
 */
const Engine = require('../../astrology-engine/src/tuvi.js');
const Knowledge = require('../../knowledge/src/index.cjs');
const MainStudy = require('../../knowledge/src/star-study-guide.json').stars;
const Pending = require('./pending-candidates.json');
const Baselines = require('../fixtures/chart-baselines.json');

const GROUPS = Object.freeze([
  {id:'main',label:'14 chính tinh',type:'natal',get:c=>c.houses.flatMap(h=>h.stars)},
  {id:'auxiliary',label:'Phụ tinh cơ bản',type:'natal',get:c=>c.auxiliaries.map(s=>s.name)},
  {id:'year_branch',label:'Sao theo chi năm sinh',type:'natal',get:c=>c.yearStars.map(s=>s.name)},
  {id:'supplementary',label:'Sao bổ sung theo tháng/ngày',type:'natal',get:c=>c.additionalStars.map(s=>s.name)},
  {id:'advanced',label:'Không–Kiếp, Hỏa–Linh',type:'natal',get:c=>c.advancedStars.map(s=>s.name)},
  {id:'traditional',label:'Phụ tinh V11.13',type:'natal',get:c=>c.traditionalStars.map(s=>s.name)},
  {id:'natal_extensions',label:'Phụ tinh V11.14',type:'natal',get:c=>c.natalExtensionStars.map(s=>s.name)},
  {id:'benefic',label:'Đức · Giải V11.16',type:'natal',get:c=>c.beneficStars.map(s=>s.name)},
  {id:'positional',label:'La–Võng · Thương–Sứ V11.17',type:'natal',get:c=>c.positionalStars.map(s=>s.name)},
  {id:'missing_stars',label:'Thiên Trù · Lưu Hà · Thiên Không · Đẩu Quân V11.19',type:'natal',get:c=>c.missingStars.map(s=>s.name)},
  {id:'derived',label:'Tài · Thọ · Đường Phù V11.18',type:'natal',get:c=>c.derivedStars.map(s=>s.name)},
  {id:'thai_tue',label:'Vòng Thái Tuế',type:'cycle',get:c=>c.cycles.thaiTue.map(s=>s.name)},
  {id:'bac_si',label:'Vòng Bác Sĩ',type:'cycle',get:c=>c.cycles.bacSi.map(s=>s.name)},
  {id:'trang_sinh',label:'Vòng Tràng Sinh',type:'cycle',get:c=>c.cycles.trangSinh.map(s=>s.name)}
]);
const NORMALIZE = s => String(s).normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase('vi');
function groupRecords(chart){
  return GROUPS.map(group => {
    const names = group.get(chart);
    if (!Array.isArray(names) || names.some(n=>typeof n!=='string'||!n.trim())) throw new Error(`Dữ liệu sao rỗng trong ${group.id}`);
    if (new Set(names.map(NORMALIZE)).size !== names.length) throw new Error(`Sao trùng trong ${group.id}`);
    return {...group,names};
  });
}
function validateNoOverlap(grouped){
  const seen = new Map();
  for (const g of grouped) for(const name of g.names){
    const norm = NORMALIZE(name);
    if(seen.has(norm)) throw new Error(`Một tên sao an ở nhiều nhóm: ${name} (${seen.get(norm)} / ${g.id})`);
    seen.set(norm,g.id);
  }
  return seen;
}
function validateOverCases(reference){
  const referenceGroups=groupRecords(reference);
  for (const {id,input} of Baselines.cases){
    const current=groupRecords(Engine.calculate(input));
    for(let j=0;j<current.length;j++){
      const expected=[...referenceGroups[j].names].sort((a,b)=>a.localeCompare(b,'vi'));
      const actual=[...current[j].names].sort((a,b)=>a.localeCompare(b,'vi'));
      if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error(`Danh mục sao không ổn định: ${id} / ${current[j].id}`);
    }
  }
  return Baselines.cases.length;
}
function buildInventory(){
  const chart=Engine.calculate(Baselines.cases[0].input);
  const grouped=groupRecords(chart);
  const names=validateNoOverlap(grouped);
  const baselineCount=validateOverCases(chart);
  const records=grouped.flatMap(g=>g.names.map(name=>{
    const editorial=g.id==='main' ? MainStudy[name] : Knowledge.lookupSymbol(name);
    return {name,group:g.id,groupLabel:g.label,layer:g.type,
      hasPlacement:true,hasEditorialProfile:Boolean(editorial),
      hasSpecializedTwelvePalaceInterpretations:false,
      expertValidated:false,
      reviewStatus:'cần đối chiếu chuyên môn',
      placementModule:g.id==='main'?'tuvi.js':({auxiliary:'auxiliary.js',year_branch:'year-stars.js',supplementary:'additional-stars.js',advanced:'advanced-placements.js',traditional:'traditional-stars.js',natal_extensions:'natal-extensions.js',benefic:'benefic-stars.js',positional:'positional-stars.js',derived:'derived-stars.js',missing_stars:'missing-stars.js',thai_tue:'cycles.js',bac_si:'cycles.js',trang_sinh:'cycles.js'})[g.id]};
  }));
  const missingEditorial=records.filter(x=>!x.hasEditorialProfile).map(x=>x.name);
  const unusedEditorial=Object.keys(Knowledge.starSymbols).filter(x=>!names.has(NORMALIZE(x)));
  const unusedMain=Object.keys(MainStudy).filter(x=>!names.has(NORMALIZE(x)));
  const annual=Engine.annualOverview(chart,2026);
  const annualRecords=annual.luuStars.items.map(s=>({name:s.name,layer:'annual',hasPlacement:true,reviewStatus:'cần đối chiếu chuyên môn'}));
  const annualNames=new Set(annualRecords.map(s=>NORMALIZE(s.name)));
  const pendingNatal=Pending.natal.map(item=>({...item,group:'natal',status:names.has(NORMALIZE(item.name))?'đã có, cần loại khỏi backlog':'chưa an; cần thẩm định'}));
  const pendingAnnual=Pending.annual.map(item=>({...item,group:'annual',status:annualNames.has(NORMALIZE(item.name))?'đã có, cần loại khỏi backlog':'chưa an; cần thẩm định'}));
  if(pendingNatal.some(x=>x.status.startsWith('đã có'))||pendingAnnual.some(x=>x.status.startsWith('đã có')))throw new Error('Backlog có mục đã an; cần cập nhật danh mục thay vì đếm thiếu');
  const markers=chart.obstructionMarkers.map(m=>({name:m.name,palaces:m.branches.length,type:'obstruction_marker'}));
  return {
    schemaVersion:'1.0.0',release:'V11.19',audit:'engine-derived-internal-coverage',
    methodologicalLimits:[
      'Các con số là kiểm kê thực tế của engine V11.19, không phải tỷ lệ hoàn thiện Tử Vi nói chung.',
      'Dữ liệu 22 lá số nền do chính engine tạo ra; chưa được chuyên gia xác minh độc lập.',
      'Một hồ sơ giải nghĩa không đồng nghĩa đã có 12 bài luận giải chuyên biệt hay luận hạn hoàn chỉnh.',
      'Tuần/Triệt là hai dấu án ngữ cặp cung, Tứ Hóa là nhãn chuyển hóa, không tính là sao gốc độc lập.',
      'Các đề xuất thiếu chỉ là backlog ưu tiên, không phải danh sách sao chuẩn của mọi trường phái.'
    ],
    totals:{implementedNatalAndCycleNames:records.length, mainStars:14, editorialProfilesMatched:records.length-missingEditorial.length,
      independentEditorialProfilesOutsideMain:Object.keys(Knowledge.starSymbols).length,
      annualStarOverlays:annualRecords.length, pairedObstructionMarkers:markers.length,
      natalTransformations:chart.transformations.length,annualTransformations:annual.luuTuHoa.items.length,
      annualThaiTueLocator:annual.luuThaiTueBranchIndex===undefined?0:1,
      auditedBaselineCases:baselineCount,
      pendingNatalCandidates:pendingNatal.length,pendingAnnualCandidates:pendingAnnual.length,
      starGroups:GROUPS.length,
      specialized12PalaceReadingsVerified:0,
      missingEditorialProfiles:missingEditorial.length,
      unusedEditorialProfiles:unusedEditorial.length + unusedMain.length},
    groups:grouped.map(g=>({id:g.id,label:g.label,type:g.type,count:g.names.length})),
    records,markers,annualRecords,
    transforms:{natal:chart.transformations.map(s=>s.name),annual:annual.luuTuHoa.items.map(s=>s.name)},
    gaps:{missingEditorial,unusedEditorial,unusedMain,pendingNatal,pendingAnnual,
      unimplementedPeriodLayers:['Lưu nguyệt','Lưu nhật','Lưu thời'],
      specializedPalaceReadingCoverage:'Chưa có kiểm chứng độc lập cho 12×sao theo từng vị trí, không được tuyên bố hoàn thành'},
    auditOnly:true
  };
}
module.exports=Object.freeze({GROUPS,NORMALIZE,buildInventory,validateNoOverlap});
