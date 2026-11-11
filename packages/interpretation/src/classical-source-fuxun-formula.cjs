'use strict';
/**
 * R26: reproduce ONLY the pinned source's applySchoolFuxun post-processing.
 *
 * The reference calls iztro first. It then reads the already placed 旬空 and
 * inserts 副旬 at its paired branch. This function does NOT calculate the
 * original 旬空, run iztro or identify Thiên Đồ Tuần with 旬空.
 *
 * Source: Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d
 *         lib/ziwei/algorithm.ts, applySchoolFuxun.
 */
const {SOURCE_COMMIT}=require('./classical-source-void-vocabulary.cjs');
const SOURCE_URL='https://github.com/Renhuai123/ziwei-doushu/blob/'+SOURCE_COMMIT+'/lib/ziwei/algorithm.ts';
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const CAUTION='Chỉ tái hiện thao tác đặt 副旬 sau khi đã có vị trí 旬空 từ nguồn. Không tính được 旬空 từ năm sinh, không chạy iztro, không đồng nhất với Tuần của Thiên Đồ và không xác nhận cách cục.';
/**
 * Branch input is the SOURCE chart branch index (Tý=0), not a school-table
 * 1-based code and not a Vietnamese natal chart object. 0..11 only.
 */
function projectSourceFuxunPartner(xunkongBranchIndex){
 if(!Number.isInteger(xunkongBranchIndex)||xunkongBranchIndex<0||xunkongBranchIndex>=12)
  return null;
 const partner=xunkongBranchIndex%2===0
  ?(xunkongBranchIndex+1)%12
  :(xunkongBranchIndex+11)%12;
 return Object.freeze({
  inputKind:'source-xunkong-branch-index',
  primaryName:'旬空',partnerName:'副旬',
  primaryBranchIndex:xunkongBranchIndex,partnerBranchIndex:partner,
  primaryBranch:BRANCHES[xunkongBranchIndex],partnerBranch:BRANCHES[partner],
  sourceFormulaReproduced:true,
  sourceXunkongPlacementVerified:false,
  iztroPlacementVerified:false,
  sourceSchoolParityVerified:false,
  natalChartParityVerified:false,
  sourceCriterionVerified:false,
  sourceUrl:SOURCE_URL,caution:CAUTION
 });
}
/**
 * Six adjacent, unordered branch pairs; either member can be 旬空.
 * These are examples of the source's conditional operation, not natal data.
 */
const SOURCE_FUXUN_PAIRS=Object.freeze(
 [0,2,4,6,8,10].map(index=>Object.freeze({
  branches:Object.freeze([BRANCHES[index],BRANCHES[index+1]]),
  branchIndices:Object.freeze([index,index+1]),
  primaryIfEven:BRANCHES[index],
  partnerIfEven:BRANCHES[index+1],
  sourceXunkongPlacementVerified:false
 }))
);
module.exports=Object.freeze({
 SOURCE_URL,CAUTION,SOURCE_FUXUN_PAIRS,projectSourceFuxunPartner
});
