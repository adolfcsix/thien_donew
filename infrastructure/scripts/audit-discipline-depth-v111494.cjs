#!/usr/bin/env node
'use strict';
/** Content inventory, NOT a mathematical or professional certification. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const disciplines=require('../../packages/knowledge/src/research-disciplines.json').records;
const {buildInventory}=require('../../packages/star-audit/src/index.cjs');
const guide=require('../../packages/knowledge/src/annual-palace-deep-reading-v111494.json');
const {records:main}=require('../../packages/knowledge/src/primary-star-palace-guidance.json');
const {profiles:palaces}=require('../../packages/knowledge/src/twelve-palace-study.json');
const annualEngine=require('../../packages/astrology-engine/src/tuvi.js');
const {comparePeriods}=require('../../packages/interpretation/src/period-timeline.cjs');
const assert=require('node:assert/strict');
const edition='11.149.4';
const special={
 'tu-vi':{priority:'P1',action:'Đối chứng 11 sao/4 dị danh, vòng sao khác truyền bản, Lưu Thiên Không và ngoại lệ vận hạn; thẩm định 168 hướng dẫn sao–cung.'},
 'bat-tu':{priority:'P1',action:'Mở bảng tiết khí Jie vượt 2025–2027 sau khi có đối chiếu thiên văn; test múi giờ và dụng thần theo phái.'},
 'lich-phap':{priority:'P1',action:'Đối chứng tháng nhuận, lịch lịch sử và thời điểm giao tiết theo vùng giờ với nguồn độc lập.'},
 'kinh-dich':{priority:'P1',action:'Rà toàn bộ 64 quẻ và hào từ, phân biệt bản dịch và trường phái; không tự tạo văn kinh.'},
 'mai-hoa':{priority:'P1',action:'Đối chứng quẻ theo phép khởi, thể–dụng, thời ứng và phản ví dụ.'},
 'luc-hao':{priority:'P1',action:'Mở rộng ca Dụng/Nguyên/Kỵ/Phục, nhật-nguyệt, động biến theo câu hỏi.'},
 'ha-lac':{priority:'P1',action:'Thêm chứng bản cho Tam Nguyên số 5, quẻ thuần, Nguyên Đường và tiết chí.'},
 'ky-mon':{priority:'P1',action:'Đối chứng từng trường phái, Môn Bách, Nhập Mộ, giờ tiết khí và ứng kỳ.'},
 'thai-at':{priority:'P1',action:'Tìm đủ ca độc lập cho 72 cục và nhánh Nguyệt/Nhật/Thời kế; không nhập chung lịch kỳ.'},
 'luc-nham':{priority:'P1',action:'Phân xử một ca thống kê 720; kiểm các trường hợp Thiệp Hại/Phản Ngâm và tháng tướng.'},
 'numerology':{priority:'P2',action:'Kiểm phép chuẩn hóa đa ngôn ngữ, Y và tên có dấu; Chaldean chưa có engine.'},
 'astrology-western':{priority:'P1',action:'Chạy astronomy-engine/moment-timezone, đối chứng vị trí hành tinh và sai số giờ sinh.'},
 'phong-thuy':{priority:'P1',action:'Đối chứng 24 sơn, vận bàn, phi tinh, Bát Trạch và hướng đo ngoài thực địa.'},
 'tarot':{priority:'P2',action:'Đối chiếu 78 lá RWS, Marseille/Thoth và quyền sử dụng hình; hoàn thiện cách đọc theo trải bài.'},
 'thiet-ban':{priority:'P1',action:'Cần chứng bản và phép định điều trọn vẹn; không có engine tự động đã duyệt.'}
};
function audit(){
 const inventory=buildInventory();
 assert.equal(disciplines.length,15);
 const ids=new Set();
 const rows=disciplines.map(d=>{
  assert.ok(!ids.has(d.id),'Trùng môn: '+d.id);ids.add(d.id);
  for(const key of ['name','focus','studyWorkflow','practiceExercise','boundary','route','reviewStatus'])assert.ok(typeof d[key]==='string'&&d[key].trim(),'Môn thiếu '+key+': '+d.id);
  assert.ok(d.route.startsWith('/'));const rel=`apps/web/src/app${d.route}/page.tsx`;
  assert.ok(fs.existsSync(path.join(root,rel)),'Thiếu trang bộ môn: '+rel);
  assert.equal(d.reviewStatus,'editorial-draft-not-expert-reviewed');
  for(const key of ['readingMethod','verificationExercise','remainingGap'])
    assert.ok(typeof d.advancedStudy?.[key]==='string'&&d.advancedStudy[key].length>45,'Thiếu kiểm chứng chuyên sâu: '+d.id+'/'+key);
  assert.equal(d.advancedStudy.expertReviewed,false);
  return {id:d.id,name:d.name,route:d.route,sourcePage:rel,priority:special[d.id].priority,documentedBoundary:d.boundary,nextAction:special[d.id].action,
    state:'SOURCE_PRESENT_EDITORIAL_UNREVIEWED',expertReviewed:false,fullAlgorithmVerified:false};
 });
 assert.equal(rows.length,Object.keys(special).length);
 const chart=annualEngine.calculate({date:'2004-05-14',calendar:'solar',gender:'Nam',hour:12,minute:0});
 const snapshot=comparePeriods(chart,2026);
 const stars=inventory.records.filter(r=>r.group==='main').map(r=>r.name);
 assert.equal(stars.length,14);
 assert.equal(Object.keys(palaces).length,12);
 let matrix=0;for(const star of stars)for(const palace of Object.keys(palaces)){
  assert.ok(main[star]?.[palace]?.interpretation,'Thiếu sao x cung: '+star+'/'+palace);matrix++;
 }
 assert.equal(matrix,168);
 assert.equal(snapshot.houses.length,12);
 assert.equal(snapshot.natalInventory.placedNameOccurrences,104);
 assert.equal(Object.keys(guide.palaces).length*3,36);
 assert.equal(Object.keys(guide.annualStars).length,12);
 return {edition,scope:'source-content-audit-not-expert-review',disciplineCount:rows.length,
  starCoverage:{natalAndCycleNamePlacements:inventory.totals.implementedNatalAndCycleNames,mainStars:14,
   palaceCount:12,mainStarPalaceEditorialCells:matrix,expertReviewedCells:0,natalProfiles:inventory.totals.editorialProfilesMatched,
   annualStars:inventory.totals.annualStarOverlays,natalTransformations:inventory.totals.natalTransformations,
   annualTransformations:inventory.totals.annualTransformations,pairedObstructions:inventory.totals.pairedObstructionMarkers,
   annualPalacePeriodQuestions:36,annualStarStudyEntries:12,missingAnnualCandidate:inventory.gaps.pendingAnnual.map(x=>x.name),
   reviewStatus:'editorial-unreviewed-no-independent-chart-certification'},
  evidence:{referenceChartStarOccurrences:snapshot.natalInventory.placedNameOccurrences,
    selectedYear:2026,annualStarsPlaced:snapshot.houses.reduce((n,h)=>n+h.annualStars.length,0)},
  rows,releasePolicy:'Not production-ready without npm ci, full build, database and independent expert verification.'};
}
if(require.main===module){
 try{const r=audit();console.log(`PASS: ${r.disciplineCount} bộ môn có trang, ${r.starCoverage.natalAndCycleNamePlacements} sao gốc/vòng; ${r.starCoverage.mainStarPalaceEditorialCells} bản ghi sao×cung, 36 câu hỏi hạn, 12 hồ sơ sao lưu.`);
  if(process.argv.includes('--write')){
   const dir=path.join(root,'docs/reports');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'V11_149_4_DEPTH_COVERAGE.json'),JSON.stringify(r,null,2)+'\n');
  }
 }catch(e){console.error('FAIL:',e.message);process.exitCode=1;}
}
module.exports=Object.freeze({audit});
