'use strict';
/**
 * V11.48 observational cross-lens questions, not a horoscope verdict.
 * Uses only audited natal positions, strength and matching natal Hóa targets;
 * the annual layer remains explicitly time-scoped and optional.
 */
const {assertChart}=require('./chart-geometry.cjs');
const {buildPalaceEvidenceLenses}=require('./palace-evidence-lenses.cjs');
const catalog=require('../../knowledge/src/palace-conditional-synthesis.json');

function buildPalaceConditionalSynthesis(chart,branchIndex,{annualEvidence=null}={}){
  assertChart(chart,branchIndex);
  const raw=buildPalaceEvidenceLenses(chart,branchIndex);
  const profile=Object.hasOwn(catalog.profiles,raw.palace)?catalog.profiles[raw.palace]:null;
  if(!profile)return {status:'unavailable',palace:raw.palace,expertReviewed:false,records:[],notice:'Chưa có hồ sơ phối hợp cho cung này.'};
  const lens=Object.fromEntries(raw.lenses.map(l=>[l.id,l]));
  const verifiedMain=lens.main.observed.filter(x=>x.strengthStatus==='verified'&&x.sourcePath&&x.strengthPath);
  const mainProblem=lens.main.problemCount>0;
  const mainEvidence=verifiedMain.map(x=>({star:x.star,kind:'chính tinh',palace:x.palace,branch:x.branch,
    branchIndex:x.branchIndex,strength:x.strength,sourcePath:x.sourcePath,strengthPath:x.strengthPath,scope:'natal'}));
  const rows=[];
  for(const def of catalog.patterns){
    const question=profile[def.id];
    const evidence=[...mainEvidence];
    const gaps=[];
    let invalid=mainProblem;
    if(mainProblem)gaps.push('Có chính tinh hoặc độ sáng chưa xác minh; không dùng làm điều kiện phối hợp.');
    if(verifiedMain.length===0)gaps.push('Thiếu chính tinh có độ sáng hợp lệ tại cung.');
    let linked=[];
    if(def.id==='main-support'||def.id==='main-challenge'){
      const second=lens[def.id==='main-support'?'support':'challenge'];
      invalid ||= second.problemCount>0;
      if(second.problemCount)gaps.push('Có sao thuộc nhóm đối chiếu bị trùng vị trí hoặc chưa được xác minh.');
      linked=second.observed.map(x=>({star:x.star,kind:def.id==='main-support'?'sao trợ lực':'sát tinh',palace:x.palace,
        branch:x.branch,branchIndex:x.branchIndex,scope:'natal',sourcePath:x.sourcePath}));
      if(!linked.length)gaps.push('Không có sao cùng nhóm tại cung.');
    }else if(def.id==='main-transformation'){
      const second=lens.transformation;
      invalid ||= second.problemCount>0;
      if(second.problemCount)gaps.push('Tứ Hóa có nhãn hoặc sao đích chưa xác minh.');
      // A valid Hóa pointing to some other star is not sufficient: it must target
      // a verified, local primary star whose brightness record is unique.
      linked=second.observed.filter(x=>verifiedMain.some(m=>m.star===x.star)).map(x=>({star:x.star,
        kind:'Tứ Hóa năm sinh',transformation:x.transformation,palace:x.palace,branch:x.branch,
        branchIndex:x.branchIndex,scope:'natal',sourcePath:x.sourcePath,targetPath:x.targetPath}));
      if(!linked.length)gaps.push('Chưa quan sát được Tứ Hóa hợp lệ gắn trực tiếp với chính tinh đã xác minh ở cung.');
    }else if(def.id==='natal-annual'){
      const audited=annualEvidence?.scope==='annual-evidence-audit'&&annualEvidence.anchorBranchIndex===branchIndex&&
        Number.isInteger(annualEvidence.year)&&Array.isArray(annualEvidence.stars)&&
        Array.isArray(annualEvidence.transformations)&&Array.isArray(annualEvidence.markers)&&
        Array.isArray(annualEvidence.rejectedStars)&&Array.isArray(annualEvidence.rejectedTransformations);
      if(!audited)gaps.push('Chưa có lớp năm xem đã kiểm toán tại đúng cung đang đọc.');
      else {
        const byLocal=arr=>arr.filter(x=>x.branchIndex===branchIndex&&x.palace===raw.palace&&x.source==='annual-only');
        linked=[...byLocal(annualEvidence.stars).map(x=>({star:x.name,kind:'sao lưu',palace:x.palace,
          branchIndex:x.branchIndex,scope:'annual',year:annualEvidence.year})),
          ...byLocal(annualEvidence.transformations).map(x=>({star:x.target,transformation:x.name,kind:'Lưu Tứ Hóa',
            palace:x.palace,branchIndex:x.branchIndex,scope:'annual',year:annualEvidence.year})),
          ...byLocal(annualEvidence.markers).map(x=>({star:x.name,kind:'dấu hạn',palace:x.palace,
            branchIndex:x.branchIndex,scope:'annual',year:annualEvidence.year}))];
        if(!linked.length)gaps.push('Không có bản ghi lưu niên hợp lệ tại cung trong năm xem.');
      }
    }else throw new Error(`Mẫu tổng hợp không hỗ trợ: ${def.id}`);
    evidence.push(...linked);
    // Never mark a combination as supported if any required evidence is invalid.
    const status=invalid?'needs-review':verifiedMain.length&&linked.length?'observed':evidence.length?'partial':'no-data';
    rows.push({id:def.id,title:def.title,question,status,condition:'verified-local-natal-and-scoped-annual',
      evidence,missing:gaps,expertReviewed:false});
  }
  return {status:'research-only',edition:catalog.edition,palace:raw.palace,branch:raw.branch,
    scope:'conditional-palace-synthesis',records:rows,expertReviewed:false,notice:catalog.notice};
}
module.exports={buildPalaceConditionalSynthesis};
