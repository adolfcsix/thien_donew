'use strict';
/**
 * V11.7 contextual reading. A pure, deterministic presentation layer.
 * No placements, fortune predictions, external requests or personalized claims.
 * Text is selected from vetted editorial records only.
 */
const {lookupPalace,lookupSymbol,lookupObstruction,combinationRules,relationshipPatterns,classicalFamilies,adjacentPalacePatterns,edition} = require('../../knowledge/src/index.cjs');
const {related,assertChart,natalStarNames}=require('./chart-geometry.cjs');
const {matchAdjacentPatterns,compareMenhThan}=require('./adjacent-menh-than.cjs');
const {matchNatalGeometry}=require('./natal-geometry.cjs');
const {buildPrimaryPalaceContext}=require('./primary-palace-context.cjs');
const {describeClassicalCandidateCriteria}=require('./classical-condition-diagnostics.cjs');
const {inspectFourCourtEvidence}=require('./four-court-evidence.cjs');
const {diagnoseNatalStarPairs}=require('./natal-pair-relations.cjs');
const {examineNatalMultiStars}=require('./natal-multi-star-study.cjs');
const {buildConditionalStarGroupGuides}=require('./conditional-star-group-guides.cjs');
const {auditAnnualEvidence}=require('./annual-evidence-audit.cjs');
const {createTwelvePalaceStudy}=require('./twelve-palace-study.cjs');
const {buildPalaceEvidenceLenses}=require('./palace-evidence-lenses.cjs');
const {buildPalaceConditionalSynthesis}=require('./palace-conditional-synthesis.cjs');
const {buildPalaceRelationalSynthesis}=require('./palace-relational-synthesis.cjs');
const {buildFourCourtReadingLedger}=require('./four-court-reading-ledger.cjs');
const {buildPalaceArgumentMap}=require('./palace-argument-map.cjs');
const {evidenceForConditionalPatterns}=require('./conditional-pattern-evidence.cjs');
const strengthLabels={M:'Miếu',V:'Vượng',D:'Đắc',B:'Bình',H:'Hãm'};
function hasGuideEntry(map,key) { return map && Object.hasOwn(map,key) ? map[key] : null; }
/** Match only explicit, verified positions. Never infer placements from editorial prose. */
function matchCombinations(house) {
  const present = new Set([
    ...house.stars,...house.auxiliaryStars,...house.yearStars,
    ...(house.additionalStars??[]),...(house.traditionalStars??[]),...(house.natalExtensionStars??[]),...(house.beneficStars??[]),...(house.positionalStars??[]),...(house.derivedStars??[]),...(house.missingStars??[]),...(house.advancedStars??[])
  ]);
  const transformations = Array.isArray(house.tuHoa) ? house.tuHoa : [];
  return combinationRules.flatMap(rule=>{
    const condition=rule.conditions;
    if(condition.scope==='same-palace') {
      if(!condition.all.every(name=>present.has(name))) return [];
      return [{id:rule.id,title:rule.title,interpretation:rule.interpretation,caution:rule.caution,
        evidence:{scope:'same-palace',stars:[...condition.all]}}];
    }
    if(condition.scope==='natal-transformation') {
      const transformation=transformations.find(item=>item.name===condition.name && typeof item.star==='string' && item.star.length>0);
      if(!transformation) return [];
      // Transformation target must exist in the chart's known natal placements.
      // A malformed or detached record never triggers an interpretation.
      if(!present.has(transformation.star)) return [];
      return [{id:rule.id,title:rule.title,interpretation:rule.interpretation,caution:rule.caution,
        evidence:{scope:'natal-transformation',stars:[transformation.star],transformation:condition.name}}];
    }
    return [];
  });
}
/**
 * V11.9: match only verified natal star positions in actual 12-house chart.
 * Patterns describe distributions, NEVER claim an established classical cách cục.
 * No transformed/annual/cycle stars are silently merged with natal stars.
 */
function matchRelationshipPatterns(chart,branchIndex) {
  assertChart(chart,branchIndex);
  const index = new Map(chart.houses.map(house=>[house.branchIndex,house]));
  const relation = related(branchIndex);
  const triad = [branchIndex,...relation.tamHop];
  const four = [...triad,relation.doiCung];
  // Ambiguous duplicate placement invalidates evidence instead of producing a guess.
  const locations = new Map();
  for(const house of chart.houses) {
    for(const name of new Set(natalStarNames(house))) {
      const existing=locations.get(name)??[];
      existing.push(house.branchIndex);
      locations.set(name,existing);
    }
  }
  return relationshipPatterns.flatMap(rule=>{
    const c=rule.conditions;
    const allowed = c.scope==='tam-hop'?triad : c.scope==='tu-chinh'?four : null;
    if(!allowed || !Array.isArray(c.all) || c.all.length<2) return [];
    const positions=c.all.map(star=>({star,branches:locations.get(star)??[]}));
    if(positions.some(p=>p.branches.length!==1 || !allowed.includes(p.branches[0]))) return [];
    if(c.requiresFocusPresence && !positions.some(p=>p.branches[0]===branchIndex)) return [];
    const unique=new Set(positions.map(p=>p.branches[0]));
    if(unique.size < c.minDistinctPalaces) return [];
    const placements=positions.map(p=>{
      const at=p.branches[0];const house=index.get(at);
      const relationKind=at===branchIndex?'Tọa cung':relation.tamHop.includes(at)?'Tam hợp':'Đối cung';
      return {star:p.star,palace:house.palace,branch:house.branch,branchIndex:at,relation:relationKind};
    });
    return [{id:rule.id,title:rule.title,interpretation:rule.interpretation,caution:rule.caution,
      evidence:{scope:c.scope,placements}}];
  });
}

/**
 * V11.10 research-only classical families. Strict Mệnh-only preliminary recognition.
 * Do not claim that a named traditional cách cục is formed or broken.
 * All observations come from natal placements only, never annual/cycle markers.
 * Duplicate names across houses invalidate the match rather than guess a position.
 */
function matchClassicalFamilies(chart,branchIndex) {
  assertChart(chart,branchIndex);
  const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
  const focus=byBranch.get(branchIndex);
  if(focus.palace!=='Mệnh') return [];
  const rel=related(branchIndex);
  const allowed=[branchIndex,...rel.tamHop,rel.doiCung];
  const positions=new Map();
  for(const house of chart.houses) {
    for(const star of new Set(natalStarNames(house))) {
      if(!positions.has(star)) positions.set(star,[]);
      positions.get(star).push(house.branchIndex);
    }
  }
  const locate=(star)=>{
    const found=positions.get(star)??[];
    return found.length===1&&allowed.includes(found[0])?found[0]:null;
  };
  const describe=(star,at)=>{
    const house=byBranch.get(at);
    return {star,palace:house.palace,branch:house.branch,branchIndex:at,
      relation:at===branchIndex?'Tọa cung':rel.tamHop.includes(at)?'Tam hợp':'Đối cung'};
  };
  return classicalFamilies.flatMap(rule=>{
    const c=rule.conditions;
    if(c.focusPalace!==focus.palace||c.scope!=='tu-chinh') return [];
    const found=c.requiredStars.map(star=>({star,at:locate(star)}));
    if(found.some(item=>item.at===null)) return [];
    // Focus star must be a MAIN star (not an injected homonymous supporting star).
    if(!c.focusAny.some(star=>focus.stars.includes(star) && locate(star)===branchIndex)) return [];
    // Required components must also come from actual natal main-star placements.
    if(found.some(item=>!byBranch.get(item.at).stars.includes(item.star))) return [];
    const placements=found.map(item=>describe(item.star,item.at));
    const supports=c.supportAny.flatMap(star=>{
      const at=locate(star);
      return at===null?[]:[describe(star,at)];
    });
    const reviewSignals=c.reviewAny.flatMap(star=>{
      const at=locate(star);
      return at===null?[]:[{type:'sát tinh',...describe(star,at)}];
    });
    const strengths=found.map(({star,at})=>{
      const entry=(byBranch.get(at).mainStarStrengths??[]).find(item=>item.name===star);
      const valid=entry&&['M','V','D','B','H'].includes(entry.status)?entry.status:null;
      return {star,status:valid,branchIndex:at};
    });
    for(const item of strengths) {
      if(item.status==='H'||item.status==='B'){
        reviewSignals.push({type:'trạng thái chính tinh',...describe(item.star,item.branchIndex)});
      }
    }
    for(const at of new Set(found.map(item=>item.at))) {
      const h=byBranch.get(at);
      for(const marker of h.obstructionMarkers??[]) {
        if(marker==='Tuần'||marker==='Triệt') {
          reviewSignals.push({type:'án ngữ',...describe(marker,at)});
        }
      }
    }
    // Valid natal transformation must target a star in the SAME house.
    for(const at of allowed){
      const h=byBranch.get(at);
      for(const hoa of h.tuHoa??[]) {
        if(hoa.name==='Hóa Kỵ' && typeof hoa.star==='string' && natalStarNames(h).includes(hoa.star)){
          reviewSignals.push({type:'Tứ Hóa năm sinh',...describe(`Hóa Kỵ (${hoa.star})`,at)});
        }
      }
    }
    const uncertainStrength=strengths.some(item=>item.status===null);
    return [{id:rule.id,title:rule.title,interpretation:rule.interpretation,boundary:rule.boundary,
      assessment:reviewSignals.length>0?'Có yếu tố cần xét thêm':'Khớp bộ sao, chưa xác định thành cách',
      evidence:{scope:'tu-chinh',placements,supports,reviewSignals,strengths,uncertainStrength}}];
  });
}

function buildPalaceReading({chart,branchIndex,guide,annual=null,includeAnnual=false}) {
  assertChart(chart,branchIndex);
  const byBranch = new Map(chart.houses.map(h=>[h.branchIndex,h]));
  const focus = byBranch.get(branchIndex);
  const topic = lookupPalace(focus.palace);
  const relation = related(branchIndex);
  const peers = relation.tamHop.map(i=>byBranch.get(i));
  const opposition = byBranch.get(relation.doiCung);
  const stars = focus.stars.map(name=>{
    const entry=hasGuideEntry(guide?.stars,name);
    const status=focus.mainStarStrengths?.find(s=>s.name===name);
    return {name, motif:entry?.motif??null, explanation:entry?.study??null,
      strength:status && Object.hasOwn(strengthLabels,status.status) ? strengthLabels[status.status] : null,
      caution:entry?.caution??null};
  });
  const otherStars=[...focus.auxiliaryStars,...focus.yearStars,...(focus.additionalStars??[]),...(focus.traditionalStars??[]),...(focus.natalExtensionStars??[]),...(focus.beneficStars??[]),...(focus.positionalStars??[]),...(focus.derivedStars??[]),...(focus.missingStars??[]),...(focus.advancedStars??[])];
  const natalHoa = focus.tuHoa.map(item=>`${item.name} (${item.star})`);
  // Explicit editorial profiles, grouped by data source; no invented stars.
  const supportingProfiles=otherStars.map(name=>({name,...(lookupSymbol(name) ?? {family:'Chưa phân nhóm',motif:null,context:null,caution:null})}));
  const cycleProfiles=Object.entries({
    'Vòng Thái Tuế':focus.cycleStars?.thaiTue??[],
    'Vòng Bác Sĩ':focus.cycleStars?.bacSi??[],
    'Vòng Tràng Sinh':focus.cycleStars?.trangSinh??[]
  }).flatMap(([family,names])=>names.map(name=>({name,family,...(lookupSymbol(name) ?? {motif:null,context:null,caution:null})})));
  const obstructionProfiles=(focus.obstructionMarkers??[]).map(name=>({name,...(lookupObstruction(name) ?? {motif:null,context:null,caution:null})}));
  const combinations=matchCombinations(focus);
  const relationshipMatches=matchRelationshipPatterns(chart,branchIndex);
  const classicalMatches=matchClassicalFamilies(chart,branchIndex);
  const classicalCriteria=focus.palace==='Mệnh'?describeClassicalCandidateCriteria(chart,branchIndex):[];
  const adjacentMatches=matchAdjacentPatterns(chart,branchIndex);
  const geometryMatches=matchNatalGeometry(chart,branchIndex);
  const natalPairStudy=diagnoseNatalStarPairs(chart,branchIndex);
  const natalMultiStarStudy=examineNatalMultiStars(chart,branchIndex,{annual,includeAnnual});
  const menhThan=compareMenhThan(chart,branchIndex);
  const annualValid=includeAnnual && annual && annual.luuStars && annual.luuTuHoa && Array.isArray(annual.luuStars.items) && Array.isArray(annual.luuTuHoa.items);
  // Single source of truth: neither summary nor study may re-read raw annual placements.
  const annualEvidence=annualValid?auditAnnualEvidence(chart,annual,branchIndex):null;
  const period=annualEvidence?{
    year:annualEvidence.year,
    markers:annualEvidence.markers.filter(item=>item.branchIndex===branchIndex).map(item=>({
      'Tiểu hạn':'Tiểu hạn của năm đang xem',
      'Đại hạn':'Đại hạn đang xét',
      'Lưu Thái Tuế':'Lưu Thái Tuế'
    })[item.name]??item.name),
    annualStars:annualEvidence.stars.filter(item=>item.branchIndex===branchIndex).map(item=>item.name),
    annualHoa:annualEvidence.transformations.filter(item=>item.branchIndex===branchIndex).map(item=>`${item.name} (${item.target})`),
    rejectedCount:annualEvidence.summary.rejectedStars+annualEvidence.summary.rejectedTransformations
  }:null;
  const twelvePalaceStudy=createTwelvePalaceStudy(chart,branchIndex,{includeAnnual,annualEvidence});
  const fourCourtReadingLedger=buildFourCourtReadingLedger(chart,branchIndex);
  return {
    edition, palace:focus.palace,branch:focus.branch,stem:focus.stem,
    title:topic?.title??'Chưa có chủ đề biên soạn',
    introduction:topic?.context??`Chưa có nội dung giải thích cho cung ${focus.palace}.`,
    reflection:topic?.reflection??'Xem dữ liệu an sao và ghi lại những điểm cần tìm hiểu.',
    boundary:topic?.boundary??'Chưa đủ dữ liệu để diễn giải.',
    guidance:topic?.guidance??[],
    stars,
    isVoChinhDieu:stars.length===0,
    supporting:otherStars,
    supportingProfiles, cycleProfiles, obstructionProfiles, combinations, relationshipMatches, classicalMatches,classicalCriteria,adjacentMatches,geometryMatches,natalPairStudy,natalMultiStarStudy,annualEvidence,twelvePalaceStudy,menhThan,
    primaryPalaceContexts:buildPrimaryPalaceContext(chart,branchIndex),
    fourCourtReadingLedger,
    palaceArgumentMap:buildPalaceArgumentMap(chart,branchIndex,{ledger:fourCourtReadingLedger}),
    conditionalPatternEvidence:evidenceForConditionalPatterns(chart,branchIndex),
    natalHoa,
    linked: [...peers.map(h=>({kind:'Tam hợp',palace:h.palace,branch:h.branch,starNames:[...h.stars]})),
      {kind:'Đối cung',palace:opposition.palace,branch:opposition.branch,starNames:[...opposition.stars]}],
    period,
    coverage:{unknownMainStars:stars.filter(x=>x.motif===null).map(x=>x.name),
      unknownSupportingStars:supportingProfiles.filter(s=>s.motif===null).map(s=>s.name),
      unknownCycleStars:cycleProfiles.filter(s=>s.motif===null).map(s=>s.name),
      supportingExplained:supportingProfiles.every(s=>s.motif!==null),
      editorialCombinationRulesEvaluated:combinationRules.length,
      relationshipPatternsEvaluated:relationshipPatterns.length,
      classicalFamiliesReviewed:classicalFamilies.length,classicalFamiliesConfirmed:false,adjacentPatternsEvaluated:adjacentPalacePatterns.length,geometryPatternsEvaluated:3,menhThanVerified:menhThan.status==='verified',
      formalPatternMatching:false,completeAnnualAnalysis:false},
    notice:'Đây là hướng dẫn đọc biểu tượng theo dữ liệu lá số, không phải kết luận hoặc dự báo về cá nhân.',
  };
}
module.exports={...require('./tarot-comparison.cjs'),...require('./tarot-depth.cjs'),buildDeepChartReading:require('./deep-chart-reading.cjs').buildDeepChartReading,evidenceForConditionalPatterns,buildStarEvidenceMatrix:require('./star-evidence-matrix.cjs').buildStarEvidenceMatrix,buildWholeChartWalkthrough:require('./whole-chart-walkthrough.cjs').buildWholeChartWalkthrough,buildPalaceArgumentMap,buildFourCourtReadingLedger,buildPalaceRelationalSynthesis,buildPalaceConditionalSynthesis,buildPalaceEvidenceLenses,createTwelvePalaceStudy,auditAnnualEvidence,examineNatalMultiStars,buildConditionalStarGroupGuides,diagnoseNatalStarPairs,buildFourCourtStudyGuide:require('./four-court-study-guide.cjs').buildFourCourtStudyGuide,inspectFourCourtEvidence,buildPrimaryPalaceContext,buildPalaceReading,matchCombinations,matchRelationshipPatterns,matchClassicalFamilies,describeClassicalCandidateCriteria,matchAdjacentPatterns,matchNatalGeometry,compareMenhThan,comparePeriods:require('./period-timeline.cjs').comparePeriods,getTemporalExplorer:require('./temporal-explorer.cjs').getTemporalExplorer,listLunarMonths:require('./temporal-explorer.cjs').listLunarMonths,getHourBranch:require('./temporal-explorer.cjs').getHourBranch,getSubannualResearch:require('./temporal-explorer.cjs').getSubannualResearch,calculateSubannualBranches:require('../../astrology-engine/src/subannual-placements.js').calculateSubannualBranches};
