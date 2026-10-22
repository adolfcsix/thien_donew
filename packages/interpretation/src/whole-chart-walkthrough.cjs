'use strict';
/**
 * V11.62 — guided, full natal-chart reading. No placements or inference of
 * cát/hung: evidence is delegated to the V11.58/11.61 audited four-court layers.
 * All prose is conditional, observational and independent of annual overlays.
 */
const {assertChart,related}=require('./chart-geometry.cjs');
const {buildFourCourtReadingLedger}=require('./four-court-reading-ledger.cjs');
const {buildPalaceArgumentMap}=require('./palace-argument-map.cjs');
const {lookupPalace}=require('../../knowledge/src/index.cjs');
const PALACES=['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];
const CASE_THREADS=[
 {id:'menh-tai-quan',title:'Mệnh · Tài Bạch · Quan Lộc',palaces:['Mệnh','Tài Bạch','Quan Lộc'],geometry:'tam-hop',question:'Các chứng cứ thuộc Mệnh, Tài Bạch và Quan Lộc hỗ trợ hoặc đặt vấn đề cho nhau ở điểm nào? Không suy ra nghề nghiệp hay tài chính tương lai.'},
 {id:'menh-thien-di',title:'Mệnh · Thiên Di',palaces:['Mệnh','Thiên Di'],geometry:'doi-cung',question:'Chính tinh tọa cung Mệnh và đối cung Thiên Di được xác minh đến đâu? Đừng đồng nhất hai vị trí.'},
 {id:'phuc-dien',title:'Phúc Đức · Điền Trạch',palaces:['Phúc Đức','Điền Trạch'],geometry:'thematic',question:'So sánh hai chủ đề Phúc Đức và Điền Trạch như một bài tập, không mặc định chúng tạo thành cách cục hình học.'}
];
const clean=(list)=>[...new Set(list)];
const observedMain=(court)=>court.groups.main.map(x=>x.star);
const courtText=(court)=>{
 const stars=observedMain(court);
 if(court.isVoChinhDieu)return `Cung ${court.palace} (${court.branch}) vô chính diệu; đây là dữ liệu an sao, không phải lỗi độ sáng.`;
 if(!stars.length)return `Cung ${court.palace} (${court.branch}) có chính tinh chưa được xác minh; tạm ngừng mọi suy luận dựa trên chính tinh.`;
 return `Cung ${court.palace} (${court.branch}) ghi nhận chính tinh ${stars.join(', ')} đã kiểm tra vị trí và độ sáng.`;
};
function validatePalaces(chart){
 assertChart(chart,0);
 const names=chart.houses.map(h=>h.palace);
 if(new Set(names).size!==PALACES.length || PALACES.some(p=>!names.includes(p)))
  throw new RangeError('Lá số thiếu hoặc trùng tên trong bộ 12 cung Tử Vi.');
}
function buildWholeChartWalkthrough(chart){
 validatePalaces(chart);
 const byPalace=new Map(chart.houses.map(h=>[h.palace,h]));
 const steps=PALACES.map((palace,index)=>{
  const anchor=byPalace.get(palace);
  const ledger=buildFourCourtReadingLedger(chart,anchor.branchIndex);
  const map=buildPalaceArgumentMap(chart,anchor.branchIndex,{ledger});
  const [local,triadA,triadB,opposite]=ledger.courts;
  const cases=map.arguments.map(argument=>({id:argument.id,title:argument.title,status:argument.status,
   checks:argument.checks.map(c=>({label:c.label,met:c.met})),
   evidence:argument.evidence.map(e=>({star:e.star,kind:e.kind,palace:e.palace,branch:e.branch,
    branchIndex:e.branchIndex,relation:e.relation,...(e.transformation?{transformation:e.transformation}:{}),
    ...(e.strength?{strength:e.strength}:{})})),
   missing:[...argument.missing],issues:argument.issues.map(issue=>({star:issue.star,reason:issue.reason,palace:issue.palace})),
   question:argument.question,counterexample:argument.counterexample}));
  const status=map.summary.needsReview?'needs-review':map.summary.observed===4?'fully-observed':
   (map.summary.observed||map.summary.partial)?'partly-observed':'no-data';
  const issues=clean(ledger.courts.flatMap(c=>c.issues.map(x=>`${c.palace}: ${x.star} — ${x.reason}`)));
  const guide=lookupPalace(palace);
  return {order:index+1,palace,branch:anchor.branch,branchIndex:anchor.branchIndex,title:guide?.title??palace,
   status,localIsVoChinhDieu:local.isVoChinhDieu,localMain:observedMain(local),
   geometry:{triad:[triadA.palace,triadB.palace],opposite:opposite.palace},
   paragraphs:[courtText(local),`Hai cung tam hợp: ${courtText(triadA)} ${courtText(triadB)}`,
    `Đối cung: ${courtText(opposite)}`,
    cases.some(c=>c.status==='needs-review')?'Có dấu hiệu chưa đạt kiểm toán: tạm loại các chứng cứ bị nghi vấn.':
     'Các nhận định dưới đây chỉ phản ánh điều kiện khảo sát đã ghi nhận, không xác nhận cách cục hay cát hung.'],
   cases,issues,reflection:guide?.reflection??'Đối chiếu nhiều cung trước khi tự rút ra nhận xét.',
   expertReviewed:false,confirmedClassicalFormation:false};
 });
 const lookup=new Map(steps.map(step=>[step.palace,step]));
 const threads=CASE_THREADS.map(def=>{
  const group=def.palaces.map(palace=>lookup.get(palace));
  const home=group[0],branches=group.map(p=>p.branchIndex);
  const geometryVerified=def.geometry==='tam-hop'?def.palaces.slice(1).every(p=>related(home.branchIndex).tamHop.includes(lookup.get(p).branchIndex)):
   def.geometry==='doi-cung'?branches[1]===related(home.branchIndex).doiCung:null;
  const status=group.some(p=>p.status==='needs-review')||geometryVerified===false?'needs-review':
   group.every(p=>p.status==='fully-observed')?'fully-observed':'partly-observed';
  return {id:def.id,title:def.title,question:def.question,geometry:def.geometry,geometryVerified,
   status,steps:group.map(p=>({palace:p.palace,branch:p.branch,branchIndex:p.branchIndex,
    localMain:p.localMain,status:p.status,issueCount:p.issues.length})),
   caution:'Đây là tuyến đối chiếu học tập, không phải chứng nhận cách cục, kết luận số mệnh hay dự báo.'};
 });
 return {status:'research-only',edition:'11.62.0',scope:'natal-whole-chart',expertReviewed:false,
  confirmedClassicalFormation:false,summary:{palaceCount:12,threadCount:threads.length,
   fullyObserved:steps.filter(p=>p.status==='fully-observed').length,
   needsReview:steps.filter(p=>p.status==='needs-review').length},steps,threads,
  notice:'Bản đọc 12 cung dựa trên chứng cứ an sao hiện có; không bao gồm sao lưu niên, không xác thực số mệnh và chưa được chuyên gia thẩm định độc lập.'};
}
module.exports={buildWholeChartWalkthrough};
