'use strict';
/**
 * V11.61 — a conditional argument map, not a second star-placement engine.
 * The ONLY positional input is the already audited V11.58 four-court ledger.
 * Every argument explicitly distinguishes evidence, unfulfilled prerequisites,
 * data defects and counterexamples. No annual overlays, scoring or predictions.
 */
const {buildFourCourtReadingLedger}=require('./four-court-reading-ledger.cjs');
const {assertChart}=require('./chart-geometry.cjs');
const catalogue=require('../../knowledge/src/palace-argument-prompts.json');

const KINDS=[
  {id:'toa-doi',title:'Tọa cung ↔ đối cung',overview:'Đối chiếu chính tinh của cung đang xét với chính tinh xung chiếu; vô chính diệu được ghi rõ thay vì mượn sao làm tọa thủ.'},
  {id:'hoi-tam-hop',title:'Chính tinh × trợ/sát tại tam hợp',overview:'Chỉ khảo sát khi hai loại chứng cứ cùng có mặt trong phạm vi hai cung tam hợp; không gán chiều tốt/xấu.'},
  {id:'hoa-dich',title:'Tứ Hóa năm sinh × chính tinh đích',overview:'Một nhãn Tứ Hóa chỉ được đối chiếu với chính tinh khi đúng sao đích đã có vị trí và độ sáng hợp lệ trong cùng cung.'},
  {id:'doi-trong',title:'Trợ lực × trở lực trong Tứ chính',overview:'Kiểm tra đồng thời hai nhóm dấu hiệu, không giả định một bên triệt tiêu hay thắng bên kia.'}
];
const safeItems=(court,group)=>court.groups[group].map(item=>({
 star:item.star,branchIndex:court.branchIndex,palace:court.palace,branch:court.branch,
 relation:court.relation,kind:group,
 ...(group==='main'?{strength:item.strength}:{}),
 ...(group==='transformation'?{transformation:item.transformation}:{})
}));
const unique=(items)=>[...new Map(items.map(x=>[`${x.kind}:${x.star}:${x.branchIndex}:${x.transformation??''}`,x])).values()];
function buildPalaceArgumentMap(chart,branchIndex,{ledger:providedLedger=null}={}){
 assertChart(chart,branchIndex);
 const ledger=providedLedger??buildFourCourtReadingLedger(chart,branchIndex);
 if(providedLedger && (ledger.anchorBranchIndex!==branchIndex || ledger.status!=='research-only')) throw new TypeError('Bảng chứng cứ không thuộc cung đang xét.');
 if(ledger.status==='unavailable')return {status:'unavailable',palace:ledger.palace,expertReviewed:false,arguments:[],notice:ledger.notice};
 const profile=Object.hasOwn(catalogue.profiles,ledger.palace)?catalogue.profiles[ledger.palace]:null;
 if(!profile)return {status:'unavailable',palace:ledger.palace,expertReviewed:false,arguments:[],notice:'Chưa có gợi ý đọc lập luận cho cung này.'};
 const [local,triadA,triadB,opposite]=ledger.courts;
 const triads=[triadA,triadB],all=ledger.courts;
 const group=(courts,name)=>courts.flatMap(court=>safeItems(court,name));
 const errors=(courts,kinds)=>courts.flatMap(court=>court.issues.filter(issue=>kinds.includes(issue.category)).map(issue=>({star:issue.star,reason:issue.reason,relation:court.relation,palace:court.palace,branchIndex:court.branchIndex})));
 const verify=(definition,checks,evidence,issues)=>{
  const missing=checks.filter(check=>!check.met).map(check=>check.label);
  const status=issues.length?'needs-review':checks.every(check=>check.met)?'observed':
   checks.some(check=>check.met)?'partial':'no-data';
  return {id:definition.id,title:definition.title,overview:definition.overview,
    question:profile.prompts[definition.id],counterexample:profile.counterexample,
    status,scope:'natal-four-courts',checks,evidence:unique(evidence),issues,missing,
    expertReviewed:false,confirmedClassicalFormation:false};
 };
 const argumentsList=[];
 // #1 Never confuse an empty local main-star list with an unverified brightness.
 const atLocal=group([local],'main'),atOpposite=group([opposite],'main');
 argumentsList.push(verify(KINDS[0],[
   {label:'Tọa cung có chính tinh đã xác minh, hoặc thực sự vô chính diệu',met:local.isVoChinhDieu||atLocal.length>0},
   {label:'Đối cung có ít nhất một chính tinh đã kiểm tra vị trí và độ sáng',met:atOpposite.length>0}
 ],[...atLocal,...atOpposite],errors([local,opposite],['main'])));
 // #2 A multi-court question, not a new claim of a named classical pattern.
 const triadMain=group(triads,'main');
 const triadSignals=[...group(triads,'support'),...group(triads,'challenge')];
 argumentsList.push(verify(KINDS[1],[
   {label:'Ít nhất một cung tam hợp có chính tinh đã xác minh',met:triadMain.length>0},
   {label:'Có sao trợ lực hoặc sát tinh được kiểm chứng tại hai cung tam hợp',met:triadSignals.length>0}
 ],[...triadMain,...triadSignals],errors(triads,['main','support','challenge'])));
 // #3 An actual natal Hóa must target an independently validated MAIN star in that very court.
 const transformations=group(all,'transformation'),validatedTarget=transformations.flatMap(hoa=>{
   const court=all.find(item=>item.branchIndex===hoa.branchIndex);
   return safeItems(court,'main').filter(main=>main.star===hoa.star).map(main=>({hoa,main}));
 });
 argumentsList.push(verify(KINDS[2],[
   {label:'Trong Tứ chính có Tứ Hóa năm sinh hợp lệ',met:transformations.length>0},
   {label:'Ít nhất một nhãn Hóa gắn đúng chính tinh đích đã xác minh ở cùng cung',met:validatedTarget.length>0}
 ],[...transformations,...validatedTarget.map(item=>item.main)],errors(all,['main','transformation'])));
 // #4 Obstacles and support are records to contrast, never a numeric cancellation rule.
 const supports=group(all,'support'),challenges=[...group(all,'challenge'),...group(all,'obstruction')];
 argumentsList.push(verify(KINDS[3],[
   {label:'Có sao thuộc nhóm trợ lực được xác minh trong Tứ chính',met:supports.length>0},
   {label:'Có sát tinh hoặc Tuần/Triệt hợp lệ trong Tứ chính',met:challenges.length>0}
 ],[...supports,...challenges],errors(all,['support','challenge','obstruction'])));
 return {status:'research-only',edition:catalogue.edition,scope:catalogue.scope,
  palace:ledger.palace,branch:ledger.branch,anchorBranchIndex:branchIndex,expertReviewed:false,
  summary:{caseCount:argumentsList.length,observed:argumentsList.filter(x=>x.status==='observed').length,
   partial:argumentsList.filter(x=>x.status==='partial').length,
   needsReview:argumentsList.filter(x=>x.status==='needs-review').length},
  arguments:argumentsList,notice:catalogue.notice};
}
module.exports={buildPalaceArgumentMap};
