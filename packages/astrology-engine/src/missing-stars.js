/* THIÊN ĐỒ V11.19 — Bổ sung sao năm sinh và Đẩu Quân theo dị bản đã chọn.
 * Index chi: Tý=0, Sửu=1, ... Hợi=11.
 * Lưu Hà dùng bảng Giáp Dậu, Ất Tuất, Bính Mùi, Đinh Thân, Mậu Tỵ,
 * Kỷ Ngọ, Canh Thìn, Tân Mão, Nhâm Hợi, Quý Dần (có dị bản).
 * Đẩu Quân tính từ Thái Tuế năm SINH, tháng Giêng đếm nghịch, giờ Tý đếm thuận.
 * Các bảng nguồn và dị bản được ghi trong docs, không phải bằng chứng thẩm định độc lập.
 */
(function(root){
  'use strict';
  const RULESET='natal-stem-branch-dau-quan-v11.19.0';
  const NAMES=Object.freeze(['Thiên Trù','Lưu Hà','Thiên Không','Đẩu Quân']);
  const THIEN_TRU=Object.freeze([5,6,0,5,6,8,2,6,9,10]);
  const LUU_HA=Object.freeze([9,10,7,8,5,6,4,3,11,2]);
  const mod=n=>((n%12)+12)%12;
  function calculate({yearStem,yearBranch,lunarMonth,hourBranch}){
    for(const [key,value,min,max] of [['yearStem',yearStem,0,9],['yearBranch',yearBranch,0,11],['lunarMonth',lunarMonth,1,12],['hourBranch',hourBranch,0,11]]){
      if(!Number.isInteger(value)||value<min||value>max)throw new RangeError(`${key} không hợp lệ`);
    }
    if(yearStem%2!==yearBranch%2)throw new RangeError('Can Chi năm sinh sai âm dương');
    return [
      {name:'Thiên Trù',branch:THIEN_TRU[yearStem],basis:'thien-can-nam-sinh',ruleSet:RULESET},
      {name:'Lưu Hà',branch:LUU_HA[yearStem],basis:'thien-can-nam-sinh-bang-da-chon',ruleSet:RULESET},
      {name:'Thiên Không',branch:mod(yearBranch+1),basis:'sau-thai-tue-mot-cung',ruleSet:RULESET},
      {name:'Đẩu Quân',branch:mod(yearBranch-(lunarMonth-1)+hourBranch),basis:'thai-tue-thang-nghich-gio-thuan',ruleSet:RULESET}
    ];
  }
  const api=Object.freeze({RULESET,NAMES,THIEN_TRU,LUU_HA,calculate});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ThienDoMissingStars=api;
})(typeof globalThis!=='undefined'?globalThis:this);
