'use strict';
/** V11.46 editorial workbench: no placement rules or predictions. */
const {assertChart,related}=require('./chart-geometry.cjs');
const {profiles,edition}=require('../../knowledge/src/twelve-palace-study.json');
const deepDives=require('../../knowledge/src/palace-deep-dives.json');
const {buildPalaceEvidenceLenses}=require('./palace-evidence-lenses.cjs');
const {buildPalaceConditionalSynthesis}=require('./palace-conditional-synthesis.cjs');
const {buildPalaceRelationalSynthesis}=require('./palace-relational-synthesis.cjs');
const knownStrengths=new Set(['M','V','D','B','H']);
const validNames=items=>Array.isArray(items)?[...new Set(items.filter(name=>typeof name==='string' && !!name.trim()))]:[];
// Technical provenance is accessible from buildPalaceEvidenceLenses for audits.
// Public reading objects deliberately omit internal houses[] paths (V11.7 invariant).
function presentEvidenceLenses(raw){
  return {...raw,lenses:raw.lenses.map(lens=>({
    ...lens,
    observed:lens.observed.map(({sourcePath,strengthPath,targetPath,...item})=>item),
    problems:lens.problems.map(({sourcePath,strengthPath,targetPath,...item})=>item)
  }))};
}

// Internal audit keeps evidence source paths. Public text must not expose paths.
function presentConditionalSynthesis(raw){
  return {...raw,records:raw.records.map(record=>({
    ...record,evidence:record.evidence.map(({sourcePath,strengthPath,targetPath,...item})=>item)
  }))};
}

function presentRelationalSynthesis(raw){
 return {...raw,records:raw.records.map(record=>({...record,
  evidence:record.evidence.map(({sourcePath,strengthPath,targetPath,...item})=>item)
 }))};
}
function createTwelvePalaceStudy(chart,branchIndex,{includeAnnual=false,annualEvidence=null}={}){
  assertChart(chart,branchIndex);
  const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
  const focus=byBranch.get(branchIndex),opposite=byBranch.get(related(branchIndex).doiCung);
  const profile=Object.hasOwn(profiles,focus.palace)?profiles[focus.palace]:null;
  if(!profile) return {status:'unavailable',palace:focus.palace,expertReviewed:false,notice:'Chưa có chuyên đề riêng cho cung này.'};
  const main=validNames(focus.stars),oppositeMain=validNames(opposite.stars);
  const validStrengths=main.filter(name=>{
    const records=(focus.mainStarStrengths??[]).filter(x=>x?.name===name);
    return records.length===1&&knownStrengths.has(records[0].status);
  });
  const annual=includeAnnual&&annualEvidence?.scope==='annual-evidence-audit'&&annualEvidence.anchorBranchIndex===branchIndex ? {
    year:annualEvidence.year,
    localStars:annualEvidence.stars.filter(item=>item.branchIndex===branchIndex).map(item=>item.name),
    localTransformations:annualEvidence.transformations.filter(item=>item.branchIndex===branchIndex).map(item=>`${item.name} (${item.target})`),
    localMarkers:annualEvidence.markers.filter(item=>item.branchIndex===branchIndex).map(item=>item.name),
    rejected:annualEvidence.rejectedStars.length+annualEvidence.rejectedTransformations.length
  }:null;
  const steps=[
    {scope:'Tọa cung',question:profile.questions[0],
      evidence:main.length?`${main.join(' · ')}${validStrengths.length<main.length?' · Có trạng thái sáng chưa xác định':''}`:'Vô chính diệu · Không có chính tinh tọa thủ'},
    {scope:'Đối cung',question:profile.questions[1],
      evidence:`${opposite.palace} (${opposite.branch}) · ${oppositeMain.join(' · ')||'Vô chính diệu'}`},
    {scope:'Năm xem',question:profile.questions[2],
      evidence:annual?`Năm ${annual.year} · ${annual.localStars.length} sao lưu, ${annual.localTransformations.length} Lưu Tứ Hóa, ${annual.localMarkers.length} dấu hạn đã kiểm tra${annual.rejected?` · ${annual.rejected} bản ghi bị loại trên toàn lá số`:''}`:'Chưa chọn hoặc chưa xác minh lớp lưu niên'}
  ];
  const studyDeepDives=(deepDives.profiles[focus.palace]??[]).map(item=>({
    id:item.id,title:item.title,discussion:item.discussion,question:item.question,
    related:item.relatedPalaces.map(palace=>{
      const matches=chart.houses.filter(h=>h.palace===palace);
      return matches.length===1?{palace,branch:matches[0].branch,stars:validNames(matches[0].stars),
        transformations:(matches[0].tuHoa??[]).filter(t=>typeof t?.name==='string'&&typeof t?.star==='string').map(t=>`${t.name} (${t.star})`)}:
        {palace,branch:null,stars:[],transformations:[],unavailable:true};
    })
  }));
  return {edition,status:'research-only',palace:focus.palace,branch:focus.branch,focus:profile.focus,
    steps,deepDives:studyDeepDives,evidenceLenses:presentEvidenceLenses(buildPalaceEvidenceLenses(chart,branchIndex)),
    conditionalSynthesis:presentConditionalSynthesis(buildPalaceConditionalSynthesis(chart,branchIndex,{annualEvidence:annual})),
    relationalSynthesis:presentRelationalSynthesis(buildPalaceRelationalSynthesis(chart,branchIndex)),coverage:{mainStarCount:main.length,validStrengthCount:validStrengths.length,oppositeMainStarCount:oppositeMain.length,
      annualAudited:Boolean(annual)},annual,expertReviewed:false,
    notice:'Đề cương học tập theo vị trí có thật trên lá số. Không dùng như dự đoán hoặc kết luận chuyên môn.'};
}
module.exports={createTwelvePalaceStudy};
