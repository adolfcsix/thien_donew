'use strict';
/** Displays source variants only; never called by the natal/annual placement engine. */
const source=require('./star-stem-study-v11122.json');
const vanTinh=require('./luu-nien-van-tinh-source-review.json');
function stemStudy(index){
 if(!Number.isInteger(index)||index<0||index>9)throw RangeError('Chọn một can năm sinh 0–9.');
 return {scope:source.scope,automaticPlacement:false,input:source.input,stem:source.stems[index],
  hongDiem:{name:'Hồng Diễm',branch:source.hongDiem.positions[index],sourceId:source.hongDiem.sourceId,url:source.hongDiem.url,evidenceLevel:source.hongDiem.evidenceLevel},
  vanTinh:vanTinh.sources.map(s=>({name:'Lưu Niên Văn Tinh',branch:s.positions[index],sourceId:s.id,url:s.url})),
  vanTinhTableDisagrees:vanTinh.sources[0].positions[index]!==vanTinh.sources[1].positions[index],
  transcriptionConflict:index===0?structuredClone(vanTinh.transcriptionConflict):null,
  notice:source.hongDiem.notice};
}
module.exports={stemStudy,stems:Object.freeze([...source.stems])};
