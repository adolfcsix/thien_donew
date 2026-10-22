'use strict';
const {adjacentPalacePatterns}=require('../../knowledge/src/index.cjs');
const {assertChart,natalStarNames}=require('./chart-geometry.cjs');
/**
 * V11.11: Pure positional research. Each distinct natal star must appear
 * on exactly ONE of the TWO flanking houses of the selected palace.
 * Annual stars, cycle stars and duplicate locations never count.
 */
function matchAdjacentPatterns(chart,branchIndex) {
  assertChart(chart,branchIndex);
  const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
  const left=(branchIndex+11)%12, right=(branchIndex+1)%12;
  const positions=new Map();
  for(const h of chart.houses){
    for(const star of new Set(natalStarNames(h))) {
      const at=positions.get(star)??[];
      at.push(h.branchIndex);
      positions.set(star,at);
    }
  }
  return adjacentPalacePatterns.flatMap(rule=>{
    if(!Array.isArray(rule.stars)||rule.stars.length!==2||rule.stars[0]===rule.stars[1])return [];
    const placements=rule.stars.map(star=>({star,branches:positions.get(star)??[]}));
    if(placements.some(x=>x.branches.length!==1))return [];
    const ends=placements.map(x=>x.branches[0]);
    if(!(ends.includes(left)&&ends.includes(right)))return [];
    return [{id:rule.id,title:rule.title,interpretation:rule.interpretation,caution:rule.caution,
      evidence:{scope:'giap-cung',placements:placements.map(x=>{
        const at=x.branches[0],h=byBranch.get(at);
        return {star:x.star,palace:h.palace,branch:h.branch,branchIndex:at,side:at===left?'Kề trước':'Kề sau'};
      })}}];
  });
}

/**
 * Cross-check three independent pieces of Mệnh–Thân evidence from engine.
 * When inconsistent/missing, return unavailable rather than silently inferring.
 */
function compareMenhThan(chart,branchIndex) {
  assertChart(chart,branchIndex);
  const menh=chart.houses.find(h=>h.palace==='Mệnh');
  const thanHouses=chart.houses.filter(h=>h.isThan===true);
  const than=thanHouses.length===1?thanHouses[0]:null;
  if(!menh || !than || chart.menh!==menh.branch || chart.than!==than.branch || chart.thanPalace!==than.palace) {
    return {status:'unavailable',notice:'Dữ liệu Mệnh–Thân chưa đồng nhất; cần kiểm tra lại lá số trước khi đối chiếu.',relevant:false};
  }
  const m=menh.branchIndex,t=than.branchIndex;
  const scope=m===t?'Thân cư Mệnh':(m+6)%12===t?'Thân ở Đối cung của Mệnh':
    [(m+4)%12,(m+8)%12].includes(t)?'Thân thuộc Tam hợp Mệnh':
    [(m+1)%12,(m+11)%12].includes(t)?'Thân ở cung kề Mệnh':'Thân ở cung khác';
  return {status:'verified',scope,relevant:branchIndex===m||branchIndex===t,
    menh:{branchIndex:m,branch:menh.branch,palace:menh.palace,stars:[...menh.stars]},
    than:{branchIndex:t,branch:than.branch,palace:than.palace,stars:[...than.stars]},
    explanation:m===t?'Cung Thân và cung Mệnh cùng một vị trí. Khi nghiên cứu cần đọc cả hai lớp ý nghĩa trong một cung.':
      `Cung Thân an tại ${than.palace} (${than.branch}); cung Mệnh ở ${menh.branch}. Cần xem chính tinh của cả hai cung và các cung hội chiếu, không suy ra kết quả cuộc đời từ một vị trí.`,
    notice:'Đây là đối chiếu vị trí an Mệnh và an Thân theo bộ dữ liệu đang dùng, không phải kết luận cá nhân.'};
}

module.exports={matchAdjacentPatterns,compareMenhThan};
