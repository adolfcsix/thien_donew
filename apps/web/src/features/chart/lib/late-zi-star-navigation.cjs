'use strict';
/**
 * R41: resolves an existing major-star relocation into palace coordinates.
 * Read-only, validates consistency before letting UI focus two different
 * source/destination branches. Does not choose either natal-date policy.
 */
function locateMovedStar(report,name) {
 if(typeof name!=='string'||!name||!report||
   !Array.isArray(report.branches)||!Array.isArray(report.movedStars))return null;
 const star=report.movedStars.find(v=>v?.name===name);
 if(!star)return null;
 const from=report.branches.find(v=>v.branch===star.from);
 const to=report.branches.find(v=>v.branch===star.to);
 if(!from||!to||from.branchIndex===to.branchIndex||
    !from.before?.mainStars?.includes(name)||!to.after?.mainStars?.includes(name)||
    !from.movedBefore?.includes(name)||!to.movedAfter?.includes(name))
  throw new Error('Không thể xác minh tọa độ chính tinh đã chọn.');
 return Object.freeze({
  name,from:star.from,to:star.to,
  fromIndex:from.branchIndex,toIndex:to.branchIndex,
  beforePalace:from.before.palace,
  afterPalace:to.after.palace
 });
}
module.exports=Object.freeze({locateMovedStar});
