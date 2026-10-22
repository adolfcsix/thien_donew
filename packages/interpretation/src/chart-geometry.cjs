'use strict';
/** Validated natal chart geometry; no star placement or prediction. */
const related = index => ({tamHop:[(index+4)%12,(index+8)%12],doiCung:(index+6)%12});
const strengthLabels={M:'Miếu',V:'Vượng',D:'Đắc',B:'Bình',H:'Hãm'};
function assertChart(chart,branchIndex) {
  if(!chart || !Array.isArray(chart.houses) || chart.houses.length!==12)
    throw new RangeError('Cần lá số đủ 12 cung để tổng hợp nội dung.');
  if(new Set(chart.houses.map(h=>h.branchIndex)).size!==12 || chart.houses.some(h=>!Number.isInteger(h.branchIndex)||h.branchIndex<0||h.branchIndex>11 || !Array.isArray(h.stars)))
    throw new RangeError('Cấu trúc 12 cung không hợp lệ.');
  if(!Number.isInteger(branchIndex)||branchIndex<0||branchIndex>11) throw new RangeError('Địa chi nằm ngoài 12 cung.');
}
function natalStarNames(house) {
  return [...(house.stars??[]),...(house.auxiliaryStars??[]),...(house.yearStars??[]),
    ...(house.additionalStars??[]),...(house.traditionalStars??[]),...(house.natalExtensionStars??[]),...(house.beneficStars??[]),...(house.advancedStars??[])].filter(name=>typeof name==='string' && name.length>0);
}

module.exports={related,assertChart,natalStarNames};
