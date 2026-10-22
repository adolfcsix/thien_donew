'use strict';
// Read-only comparison of ACTUAL current engine with separately captured source rules.
const Traditional=require('../../astrology-engine/src/traditional-stars.js');
const Advanced=require('../../astrology-engine/src/advanced-placements.js');
const Cycles=require('../../astrology-engine/src/cycles.js');
const Circle=require('../../knowledge/src/tuong-tien-study.cjs');
const ref=require('../fixtures/source-author-reference-v11119.json');
const branches=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const stems=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const mod=n=>((n%12)+12)%12;
function auditSourceComparison(){
 const hourRows=branches.map((hour,index)=>{const vanKhuc=mod(4+index),stars=Traditional.calculate({yearStem:0,yearBranch:0,lunarDay:1,vanXuongBranch:mod(10-index),vanKhucBranch:vanKhuc});return {hour,vanKhuc:branches[vanKhuc],engineThaiPhu:branches[stars.find(s=>s.name==='Thái Phụ').branch],sourceThaiPhu:branches[ref.hourSource.thaiPhu[index]],enginePhongCao:branches[stars.find(s=>s.name==='Phong Cáo').branch],sourcePhongCao:branches[ref.hourSource.phongCao[index]]};});
 const pairRows=stems.map((stem,index)=>{const pair=Advanced.calculate({yearStem:index,yearBranch:index,hourBranch:0,gender:'Nam'}).obstructions.find(x=>x.name==='Triệt').branches;return {stem,enginePair:pair.map(i=>branches[i]),sourceSingle:branches[ref.trietSingle[index]],sameRepresentation:false,sourceInPair:pair.includes(ref.trietSingle[index])};});
 const tuanRows=Array.from({length:60},(_,k)=>{const stem=k%10,branch=k%12,pair=Advanced.calculate({yearStem:stem,yearBranch:branch,hourBranch:0,gender:'Nam'}).obstructions.find(x=>x.name==='Tuần').branches,source=ref.tuanByDecade[Math.floor(k/10)];return {year:stems[stem]+' '+branches[branch],enginePair:pair.map(i=>branches[i]),sourcePair:source.map(i=>branches[i]),sameLocation:pair.length===source.length&&source.every(i=>pair.includes(i))};});
 let changshengCases=0,changshengMismatches=0;
 for(let k=0;k<60;k++)for(const gender of ['Nam','Nữ'])for(const cucNumber of [2,3,4,5,6]){const stem=k%10,sign=(stem%2===0)===(gender==='Nam')?1:-1;const actual=Cycles.calculate({yearStem:stem,yearBranch:k%12,gender,cucNumber,locTonBranch:0,menhBranch:0}).trangSinh;changshengCases++;if(actual.some((p,index)=>p.branch!==mod(ref.changshengAnchors[cucNumber]+sign*index)))changshengMismatches++;}
 const circleRows=branches.map((branch,index)=>({yearBranch:branch,tuong:Circle.calculateStudyCircle(index).map(x=>({name:x.name,branch:x.branch})),tue:ref.tueTienNames.map((name,i)=>({name,hanzi:ref.tueTienHanzi[i],branch:branches[mod(index+i)]})),engineThaiTue:Cycles.calculate({yearStem:index%2,yearBranch:index,gender:'Nam',cucNumber:2,locTonBranch:0,menhBranch:0}).thaiTue.map(x=>({name:x.name,branch:branches[x.branch]}))}));
 const circleAnchorMismatches=branches.filter((_,i)=>Circle.calculateStudyCircle(i)[0].branchIndex!==ref.tuongAnchors[i]).length;
 return {release:'11.119.0',scope:'research-only-snapshot-of-current-engine-and-named-source-rules',automaticPlacement:false,automaticAlias:false,expertReviewed:false,branches,stems,hourRows,pairRows,tuanRows,circleRows,summary:{hourCases:12,thaiPhuDifferences:hourRows.filter(r=>r.engineThaiPhu!==r.sourceThaiPhu).length,phongCaoDifferences:hourRows.filter(r=>r.enginePhongCao!==r.sourcePhongCao).length,tuanCases:60,tuanLocationMatches:tuanRows.filter(r=>r.sameLocation).length,trietCases:10,trietSourceSubsetMatches:pairRows.filter(r=>r.sourceInPair).length,trietRepresentationMatches:0,changshengCases,changshengMismatches,circleAnchorMismatches},ruleSets:{traditional:Traditional.RULESET,advanced:Advanced.RULESET,cycles:Cycles.RULESET},notice:'So công thức/vị trí theo nguồn được chọn; không tự chứng minh nguồn nào đúng, không tự thay quy tắc hoặc gộp alias.'};
}
module.exports={auditSourceComparison};
