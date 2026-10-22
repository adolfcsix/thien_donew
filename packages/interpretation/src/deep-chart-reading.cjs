'use strict';
/** V11.123: deterministic editorial synthesis over audited, unchanged placements.
 * Scope is explicit: natal / annual / period. Never scores or cancels symbols.
 */
const Engine=require('../../astrology-engine/src/tuvi.js');
const {assertChart,natalStarNames,related}=require('./chart-geometry.cjs');
const {buildFourCourtReadingLedger}=require('./four-court-reading-ledger.cjs');
const {buildPrimaryPalaceContext}=require('./primary-palace-context.cjs');
const {diagnoseNatalStarPairs}=require('./natal-pair-relations.cjs');
const {examineNatalMultiStars}=require('./natal-multi-star-study.cjs');
const {auditAnnualEvidence}=require('./annual-evidence-audit.cjs');
const {indexNatalStars,locateNatalStar}=require('./natal-star-index.cjs');
const {lookupPalace,lookupSymbol,combinationRules}=require('../../knowledge/src/index.cjs');
const catalog=require('../../knowledge/src/deep-reading-v11123.json');
const PALACES=Object.keys(catalog.profiles);
const STRENGTH={M:'Miếu',V:'Vượng',D:'Đắc',B:'Bình',H:'Hãm'};
const HOA=['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ'];
const hoaRules=new Map(combinationRules.filter(r=>r.conditions.scope==='natal-transformation').map(r=>[r.conditions.name,r]));
const position=p=>`${p.star??p.name} tại ${p.palace} (${p.branch})`;
const point=(court,item,kind,scope='natal',year)=>({
 id:[scope,year??'',court.branchIndex,kind,item.transformation??'',item.star??item.name].join(':'),
 scope,kind,star:item.star??item.name,palace:court.palace,branch:court.branch,branchIndex:court.branchIndex,
 relation:court.relation??'tọa cung',...(year?{year}:{}),
 ...(item.strength?{strength:item.strength}:{}),...(item.transformation?{transformation:item.transformation}:{})
});
const paragraph=(id,title,text,evidence=[],status='observed')=>({id,title,text,evidence,status});
const courtMain=c=>c.isVoChinhDieu?'vô chính diệu':c.groups.main.length?
 c.groups.main.map(s=>`${s.star} (${STRENGTH[s.strength]})`).join(', '):'chính tinh chưa đủ chứng cứ';
function hoaReading(e){
 const def=hoaRules.get(e.transformation);
 return {evidence:e,interpretation:`${e.scope==='annual'?`Lưu ${e.transformation}, năm âm lịch ${e.year}`:e.transformation+' năm sinh'} gắn với ${position(e)} (${e.relation}). ${def.interpretation}`,caution:def.caution};
}
function buildDeepChartReading(chart,year){
 assertChart(chart,0);
 if(!Number.isInteger(chart.lunar?.year)||chart.lunar.year<1900||chart.lunar.year>2100)throw new RangeError('Năm sinh âm lịch ngoài phạm vi 1900–2100.');
 if(!Number.isInteger(year)||year<chart.lunar.year||year<1900||year>2100)throw new RangeError('Năm xem phải là năm âm lịch từ năm sinh đến 2100.');
 const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
 const byPalace=new Map(chart.houses.map(h=>[h.palace,h]));
 if(byPalace.size!==12||PALACES.some(p=>!byPalace.has(p)))throw new RangeError('Lá số thiếu hoặc trùng tên trong bộ 12 cung Tử Vi.');
 const index=indexNatalStars(chart);
 const ledgers=new Map(PALACES.map(p=>{const h=byPalace.get(p);return [h.branchIndex,buildFourCourtReadingLedger(chart,h.branchIndex)];}));
 const annual=Engine.annualOverview(chart,year);
 const periods=[],periodIssues=[];
 const ageMu=year-chart.lunar.year+1;
 const validIntervals=chart.houses.filter(h=>Number.isInteger(h.daiHan?.fromAge)&&Number.isInteger(h.daiHan?.toAge)&&h.daiHan.fromAge>0&&h.daiHan.toAge===h.daiHan.fromAge+9&&h.daiHan.branch===h.branchIndex);
 const beforeFirstDaiHan=validIntervals.length>0&&ageMu<Math.min(...validIntervals.map(h=>h.daiHan.fromAge));
 const matches=validIntervals.filter(h=>ageMu>=h.daiHan.fromAge&&ageMu<=h.daiHan.toAge);
 if(annual.activeDaiHan){
  const a=annual.activeDaiHan;
  if(matches.length===1&&matches[0].branchIndex===a.branchIndex&&a.fromAge===matches[0].daiHan.fromAge&&a.toAge===matches[0].daiHan.toAge){
   periods.push({name:'Đại hạn',scope:'period',...a,basis:matches[0].daiHan.basis});
  }else periodIssues.push('Đại hạn không khớp một khoảng 10 tuổi mụ duy nhất; không dùng để luận.');
 }
 for(const [name,at,basis] of [['Tiểu hạn',annual.tieuHan?.branchIndex,annual.tieuHan?.ruleSet],['Lưu Thái Tuế',annual.luuThaiTueBranchIndex,'địa chi năm âm lịch']]){
  const h=byBranch.get(at);
  if(h)periods.push({name,scope:'period',branchIndex:at,branch:h.branch,palace:h.palace,basis});
  else periodIssues.push(`${name}: chưa xác minh được vị trí.`);
 }
 for(const p of periods){
  const r=related(p.branchIndex);
  p.fourCourts=[p.branchIndex,...r.tamHop,r.doiCung].map(at=>({branchIndex:at,palace:byBranch.get(at).palace,branch:byBranch.get(at).branch}));
  p.interpretation=`${p.name} ở ${p.palace} (${p.branch})${p.name==='Đại hạn'?`, khoảng ${p.fromAge}–${p.toAge} tuổi mụ`:`, năm âm lịch ${year}`}. Đọc chủ đề ${catalog.profiles[p.palace].temporalFocus}, rồi đối chiếu tam hợp ${p.fourCourts.slice(1,3).map(x=>x.palace).join(' · ')} và đối cung ${p.fourCourts[3].palace}. Vị trí hạn là điểm nhìn theo thời gian; tên cung và sao bản mệnh vẫn ở địa bàn gốc.`;
 }
 const natalTransformations=[],annualTransformations=[];
 const palaces=PALACES.map((palace,order)=>{
  const h=byPalace.get(palace),profile=catalog.profiles[palace],topic=lookupPalace(palace);
  const ledger=ledgers.get(h.branchIndex),courts=ledger.courts;
  const mainEvidence=courts[0].groups.main.map(s=>point(courts[0],s,'main'));
  const all=(kind)=>courts.flatMap(c=>c.groups[kind].map(s=>point(c,s,kind)));
  const issues=courts.flatMap(c=>c.issues.map(s=>({palace:c.palace,branch:c.branch,...s})));
  const contexts=buildPrimaryPalaceContext(chart,h.branchIndex).filter(c=>mainEvidence.some(e=>e.star===c.star));
  const paragraphs=[paragraph('topic',profile.theme,`${topic.context} Trục suy ngẫm của cung này: ${profile.tension}.`,[], 'editorial')];
  if(!contexts.length)paragraphs.push(paragraph('main','Chính tinh tọa cung',courts[0].isVoChinhDieu?
   `${palace} (${h.branch}) vô chính diệu. Đối cung ${courts[3].palace} (${courts[3].branch}) có ${courtMain(courts[3])}; đọc như dữ kiện xung chiếu, không chuyển sao sang ${palace}.`:
   `Có chính tinh ở ${palace} nhưng vị trí hoặc độ sáng chưa qua kiểm tra. Tạm ngừng diễn nghĩa chính tinh bị nghi vấn.`,courts[3].groups.main.map(s=>point(courts[3],s,'main')),courts[0].isVoChinhDieu?'observed':'needs-review'));
  for(const c of contexts){
   const e=mainEvidence.find(e=>e.star===c.star);
   paragraphs.push(paragraph('main-'+c.star,c.star+' trong chủ đề '+palace,
    `${position(e)} có trạng thái ${STRENGTH[e.strength]} theo bảng hiện hành. ${c.focus.replace(/[.!?]$/, '')}. ${c.potential} ${c.tradeoff} Độ sáng là nhãn theo bảng, không là điểm tốt/xấu và không tự xác nhận biểu hiện thực tế.`,[e]));
  }
  const linkedEvidence=courts.slice(1).flatMap(c=>c.groups.main.map(s=>point(c,s,'main')));
  paragraphs.push(paragraph('four-courts','Tam phương tứ chính',
   `Hai cung tam hợp ${courts[1].palace} (${courts[1].branch}: ${courtMain(courts[1])}) và ${courts[2].palace} (${courts[2].branch}: ${courtMain(courts[2])}); đối cung ${courts[3].palace} (${courts[3].branch}: ${courtMain(courts[3])}). ${ledger.questions[1].question} ${ledger.questions[2].question} Đây là liên hệ giữa các cung; chỉ những sao thực sự cùng vị trí mới gọi là đồng cung.`,linkedEvidence,linkedEvidence.length?'observed':'no-data'));
  const support=all('support'),challenge=all('challenge'),obstruction=all('obstruction');
  paragraphs.push(paragraph('modifiers','Trợ lực và yếu tố cần điều tiết',
   `${support.length?`Nhóm hỗ trợ đã ghi nhận: ${support.map(position).join('; ')}.`:'Chưa ghi nhận sao thuộc nhóm hỗ trợ đang khảo sát trong tứ chính.'} ${challenge.length?`Nhóm cần đối chiếu: ${challenge.map(position).join('; ')}.`:'Chưa ghi nhận sao thuộc nhóm sát tinh đang khảo sát trong tứ chính.'} ${obstruction.length?`Dấu án ngữ: ${obstruction.map(position).join('; ')}.`:''} ${support.length&&challenge.length?'Khi cả hai nhóm có mặt, đặt câu hỏi hỗ trợ nào giải quyết áp lực nào trong chủ đề cung; không cộng trừ số sao để kết luận.':'Cần đọc vai trò của sao cùng chính tinh và hoàn cảnh cung, không suy hiệu quả chỉ từ sự có mặt hoặc vắng mặt của một nhóm.'} Tuần/Triệt không tự động xóa sao, đổi độ sáng hay chứng nhận giải trừ.`,[...support,...challenge,...obstruction],issues.length?'needs-review':'observed'));
  for(const [kind,items,label] of [['support',support,'Phối hợp cùng sao trợ lực'],['challenge',challenge,'Phối hợp cùng yếu tố gây sức ép']]){
   const local=items.filter(e=>e.branchIndex===h.branchIndex);
   if(mainEvidence.length&&local.length){
    const symbols=local.map(e=>{const s=lookupSymbol(e.star);return s?`${e.star}: ${s.context}`:'';}).filter(Boolean);
    paragraphs.push(paragraph('local-'+kind,label,
     `${mainEvidence.map(e=>e.star).join(' và ')} cùng tọa ${palace} (${h.branch}) với ${local.map(e=>e.star).join(', ')}. ${symbols.join(' ')} Trong chủ đề ${profile.theme.toLowerCase()}, đặt các biểu tượng này cạnh xu hướng chính tinh đã nêu: ${profile.tension.toLowerCase()}. Điều kiện ở đây là đồng cung đã kiểm tra, không áp dụng nguyên đoạn này cho một sao chỉ ở tam hợp hoặc đối cung.`,[...mainEvidence,...local]));
   }
  }
  const localHoa=all('transformation').filter(e=>e.branchIndex===h.branchIndex);
  if(localHoa.length>=2){
   const targets=new Set(localHoa.map(e=>e.star));
   paragraphs.push(paragraph('multiple-hoa','Nhiều nhãn Hóa trong một cung',
    `${localHoa.map(e=>`${e.transformation} → ${e.star}`).join('; ')} cùng ở ${palace} (${h.branch}). ${targets.size===1?'Các nhãn cùng gắn một sao đích; phải giữ từng ý nghĩa riêng.':'Các nhãn gắn những sao đích khác nhau; đọc từng sao nhận Hóa trước khi nối chủ đề cung.'} Trọng tâm đối chiếu là ${profile.temporalFocus}; không coi các nhãn Hóa bù trừ nhau hoặc đồng nghĩa một kết quả thuận/nghịch.`,localHoa));
  }
  const otherSymbols=[...new Set(natalStarNames(h))].filter(star=>!h.stars.includes(star)&&!support.some(e=>e.star===star)&&!challenge.some(e=>e.star===star)).flatMap(star=>{
   const p=locateNatalStar(index,byBranch,star),s=lookupSymbol(star);
   return p.status==='observed'&&p.branchIndex===h.branchIndex&&p.layers.length===1&&(h[p.layers[0]]??[]).filter(x=>x===star).length===1&&s?[{evidence:point(courts[0],{star},'other'),motif:s.motif,context:s.context,caution:s.caution}]:[];
  });
  const pairStudy=diagnoseNatalStarPairs(chart,h.branchIndex);
  const relationships=pairStudy.records.filter(p=>p.status==='matched').flatMap(p=>{
   // A positional pair also needs the audited layer and (for main stars) brightness.
   const evidence=p.placements.map(x=>point({...x,relation:courts.find(c=>c.branchIndex===x.branchIndex)?.relation??(x.branchIndex===(h.branchIndex+11)%12?'giáp cung trước':'giáp cung sau')},x,'pair'));
   const clean=p.placements.every(x=>{const c=ledgers.get(x.branchIndex).courts[0];return x.layers.length===1&&['main','support','challenge'].some(k=>c.groups[k].some(s=>s.star===x.star))&&!c.issues.some(i=>i.star===x.star);});
   return clean?[{id:p.id,title:p.title,relation:p.relationLabel,evidence,text:`${p.title}: ${p.relationLabel.toLowerCase()} giữa ${p.placements.map(position).join(' và ')}. ${catalog.pairAngles[p.id]} ${p.nextStep}`}]:[];
  });
  const multi=examineNatalMultiStars(chart,h.branchIndex);
  const groups=multi.records.filter(g=>g.status==='all-observed'&&g.placements.every(p=>p.layers.length===1&&!courts.find(c=>c.branchIndex===p.branchIndex)?.issues.some(i=>i.star===p.star))).map(g=>({
   id:g.id,title:g.title,evidence:g.placements.map(p=>point(p,p,'group')),
   text:`${g.title}: đủ ${g.required} sao trong tứ chính; ${new Set(g.placements.map(p=>p.branchIndex)).size} vị trí thực tế. ${g.placements.map(p=>`${position(p)} (${p.relation})`).join('; ')}. ${g.nextStep} Đủ bộ theo vị trí chưa xác nhận thành cách hoặc sức mạnh của bộ sao.`
  }));
  const natalHoa=all('transformation').map(hoaReading);
  natalTransformations.push(...natalHoa.filter(x=>x.evidence.branchIndex===h.branchIndex));
  const audited=auditAnnualEvidence(chart,annual,h.branchIndex);
  const annualStars=audited.stars.filter(s=>s.inFourCourts).map(s=>point({...s,branch:byBranch.get(s.branchIndex).branch},s,'star','annual',year));
  const annualHoa=audited.transformations.filter(s=>s.inFourCourts).map(s=>hoaReading(point({...s,branch:byBranch.get(s.branchIndex).branch},{star:s.target,transformation:s.name},'transformation','annual',year)));
  annualTransformations.push(...annualHoa.filter(x=>x.evidence.branchIndex===h.branchIndex));
  const markers=periods.map(p=>({name:p.name,branch:p.branch,branchIndex:p.branchIndex,palace:p.palace,
   relation:p.branchIndex===h.branchIndex?'tọa cung':courts.slice(1,3).some(c=>c.branchIndex===p.branchIndex)?'tam hợp':courts[3].branchIndex===p.branchIndex?'đối cung':'ngoài tứ chính'}));
  const inScope=markers.filter(p=>p.relation!=='ngoài tứ chính');
  const annualParagraph=paragraph('annual','Chủ đề đối chiếu năm '+year,
   `Năm âm lịch ${year} (${annual.canChi}), ${ageMu} tuổi mụ. ${inScope.length?inScope.map(p=>`${p.name} ở ${p.palace} (${p.branch}), ${p.relation} với ${palace}`).join('; ')+'.':'Không có điểm Đại hạn/Tiểu hạn/Lưu Thái Tuế trong tứ chính của cung này; lớp sao lưu vẫn cần đọc riêng.'} Dùng lớp năm để khảo sát ${profile.temporalFocus}. ${profile.question} ${annualStars.length?`Sao lưu trong phạm vi: ${annualStars.map(s=>`${position(s)} (${s.relation})`).join('; ')}.`:'Chưa có sao lưu được xác minh trong phạm vi.'} Các nhãn lưu giữ nguyên năm áp dụng; không biến thành đặc tính bản mệnh hoặc dự báo sự kiện.`,annualStars,audited.rejectedStars.length||audited.rejectedTransformations.length?'needs-review':'observed');
  return {order:order+1,palace,branch:h.branch,branchIndex:h.branchIndex,
   natal:{theme:profile.theme,tension:profile.tension,voChinhDieu:courts[0].isVoChinhDieu,courts,paragraphs,relationships,groups,otherSymbols,transformations:natalHoa,
    issues,status:issues.length?'needs-review':'observed',question:profile.question,counterexample:profile.counterexample,boundary:topic.boundary},
   annual:{year,paragraph:annualParagraph,markers,stars:annualStars,transformations:annualHoa,
    rejected:[...audited.rejectedStars,...audited.rejectedTransformations]}};
 });
 // Cross-layer links are retained as TWO records: neither cancellation nor amplification.
 const transformationLinks=natalTransformations.flatMap(n=>annualTransformations.filter(a=>a.evidence.star===n.evidence.star&&a.evidence.branchIndex===n.evidence.branchIndex).map(a=>({
  natal:n.evidence,annual:a.evidence,text:`${n.evidence.star} tại ${n.evidence.palace}: ${n.evidence.transformation} năm sinh và Lưu ${a.evidence.transformation} năm ${year} cùng gắn một sao đích. Đọc hai lớp riêng theo bối cảnh cung; không tự cộng lực, triệt tiêu hay suy sự kiện.`})));
 const overlaps=[];
 for(let i=0;i<periods.length;i++)for(let j=i+1;j<periods.length;j++)if(periods[i].branchIndex===periods[j].branchIndex)
  overlaps.push({palace:periods[i].palace,branch:periods[i].branch,names:[periods[i].name,periods[j].name],text:`${periods[i].name} và ${periods[j].name} cùng vị trí: chủ đề ${periods[i].palace} được nhìn ở hai lớp thời gian, không tự tăng cát/hung.`});
 return {format:'thien-do.deep-chart-reading',schemaVersion:1,edition:'11.123.0',status:'editorial-unreviewed',expertReviewed:false,
  method:{description:catalog.method,natalRuleSet:chart.ruleSet,natalTransformationRuleSet:chart.tuHoaRuleSet,annualRuleSet:annual.ruleSet,annualTransformationRuleSet:annual.luuTuHoa.ruleSet,tieuHanRuleSet:annual.tieuHan.ruleSet,sourceRefs:catalog.provenance},
  year,canChi:annual.canChi,ageMu,palaces,natalTransformations,annualTransformations,transformationLinks,
  periods:{items:periods,overlaps,issues:periodIssues,beforeFirstDaiHan,daiHanStatus:periodIssues.length?'needs-review':periods.some(p=>p.name==='Đại hạn')?'active':beforeFirstDaiHan?'before-first':'outside-range',notice:annual.note},
  summary:{palaces:12,reviewPalaces:palaces.filter(p=>p.natal.issues.length).length,natalTransformations:natalTransformations.length,annualTransformations:annualTransformations.length,annualStars:annual.luuStars.items.length},
  limitations:[...catalog.limitations],notice:'Bài luận biểu tượng có dữ kiện đối chiếu, không phải kết luận về cá nhân hay dự báo tương lai.'};
}
module.exports={buildDeepChartReading};
