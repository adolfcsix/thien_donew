'use strict';
/**
 * R24. Read-only geometry audit: compare a verified Thiên Đồ Triệt pair with
 * the *unordered* source double-Jiekong pair by year stem.
 *
 * Identical two-branch geometry never proves the two systems use the same
 * star names, school variant, iztro placements, or interpretative criteria.
 * Source: Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d
 */
const {auditNatalObstructionEvidence}=require('./natal-obstruction-evidence.cjs');
const {auditSourceDoubleJiekongCodeConcordance}=require('./classical-source-void-vocabulary.cjs');
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const LIMITATION='Chỉ đối chiếu cặp địa chi không phân biệt thứ tự. Triệt của Thiên Đồ là dấu án ngữ hai cung; 截空 / 副截 của nguồn là hai nhãn sao theo biến thể double. Không suy ra tương đương tên, an sao iztro hoặc điều kiện cách cục.';
function auditClassicalVoidPairGeometry(chart){
 const report=(status,reason,extra={})=>Object.freeze({
  status,reason,comparisonScope:'unordered-branch-pair',
  verifiedChartObstructions:extra.verifiedChartObstructions===true,
  sourceFormulaConcordant:extra.sourceFormulaConcordant===true,
  pairGeometryConcordant:status==='matched'?true:status==='mismatched'?false:null,
  yearStem:extra.yearStem??null,
  chartTrietBranches:Object.freeze(extra.chartTrietBranches??[]),
  sourceDoubleBranches:Object.freeze(extra.sourceDoubleBranches??[]),
  sourceDoubleCodes:Object.freeze(extra.sourceDoubleCodes??[]),
  sourcePlacementVerified:false,sourceSchoolParityVerified:false,
  sourceCriterionVerified:false,nameEquivalenceVerified:false,
  iztroPlacementVerified:false,
  limitation:LIMITATION
 });
 const obstruction=auditNatalObstructionEvidence(chart);
 if(!obstruction.verified)return report('unknown',obstruction.reason);
 const stemName=typeof chart.yearCanChi==='string'?chart.yearCanChi.split(' ')[0]:null;
 if(!STEMS.includes(stemName))return report('unknown','Thiếu thiên can năm sinh đã kiểm toán.');
 const reference=auditSourceDoubleJiekongCodeConcordance(stemName);
 if(!reference||!reference.sourceFormulaConcordant)
  return report('unknown','Bảng nguồn không phù hợp công thức cặp chi hoặc thiên can.');
 const triet=chart.obstructionMarkers.find(v=>v.name==='Triệt');
 if(!triet||!Array.isArray(triet.branches)||triet.branches.length!==2||
    !triet.branches.every(v=>Number.isInteger(v)&&v>=0&&v<12))
  return report('unknown','Thiếu cặp Triệt nguyên cục đã kiểm toán.');
 const sourceCodes=reference.formulaCodes;
 if(sourceCodes.length!==2||!sourceCodes.every(v=>Number.isInteger(v)&&v>=1&&v<=12))
  return report('unknown','Mã chi nguồn không hợp lệ.');
 const sourceIndices=sourceCodes.map(v=>v-1);
 const matched=[...triet.branches].sort((x,y)=>x-y).every(
  (n,i)=>n===[...sourceIndices].sort((x,y)=>x-y)[i]);
 const extra={
  verifiedChartObstructions:true,sourceFormulaConcordant:true,yearStem:stemName,
  chartTrietBranches:triet.branches.map(v=>BRANCHES[v]),
  sourceDoubleBranches:reference.formulaBranches,
  sourceDoubleCodes:sourceCodes
 };
 return report(matched?'matched':'mismatched',
  matched?'Hai cặp địa chi trùng hình học theo hai bảng đã định phiên bản; không chứng minh đồng nhất sao.':'Hai cặp địa chi khác nhau; không được tự đồng nhất.',
  extra);
}
module.exports=Object.freeze({auditClassicalVoidPairGeometry,LIMITATION});
