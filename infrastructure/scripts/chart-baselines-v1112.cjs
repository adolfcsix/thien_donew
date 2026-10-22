'use strict';
/** Reproducible, intentionally pinned ENGINE regression baselines (not expert truth). */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const outfile=path.resolve(__dirname,'../../packages/star-audit/fixtures/chart-baselines.json');
const c=(id,date,gender,hour,minute=0,year=2026,description='')=>({id,description,input:{date,calendar:'solar',gender,hour,minute},annualYear:year});
const CASES=[
 c('giap-than-nam','2004-08-15','Nam',8,30,2026,'Giáp Thân; bản đối chứng cho mô-đun Mệnh–Thân'),
 c('giap-than-nu','2004-08-15','Nữ',8,30,2026,'Đổi giới tính, giữ ngày giờ'),
 c('ty-dau-som','2024-02-09','Nam',22,59,2025,'Ngay trước Tết âm lịch 2024'),
 c('ty-dau-muon','2024-02-09','Nam',23,0,2025,'Đầu giờ Tý, cùng ngày dân sự'),
 c('tet-2024','2024-02-10','Nam',0,0,2025,'Bước qua Tết âm lịch 2024'),
 c('truoctet-2026','2026-02-16','Nữ',22,30,2026,'Một ngày trước Tết âm lịch 2026'),
 c('tet-2026','2026-02-17','Nữ',0,10,2026,'Bước sang năm âm Bính Ngọ'),
 c('nhuan-2025-nam','2025-07-27','Nam',10,15,2026,'Tháng 6 nhuận, nam'),
 c('nhuan-2025-nu','2025-07-27','Nữ',10,15,2026,'Tháng 6 nhuận, nữ'),
 c('nhuan-2025-ty','2025-08-14','Nữ',23,55,2026,'Tháng nhuận và giờ Tý'),
 c('giap-ty','1984-04-01','Nam',4,30,1996,'Giáp Tý / tuần hoàn Tiểu hạn 12 năm'),
 c('canh-ngo','1990-06-15','Nữ',16,30,2002,'Canh Ngọ / Tứ Hóa dị bản'),
 c('nham-than','1992-09-25','Nam',11,30,2026,'Nhâm Thân / Tứ Hóa dị bản'),
 c('ky-mao','1999-12-21','Nữ',19,0,2026,'Kỷ Mão / chiều an vòng sao'),
 c('tan-ty','2001-05-12','Nam',5,15,2026,'Tân Tỵ / chiều an vòng sao'),
 c('quy-mui','2003-11-08','Nữ',6,20,2026,'Quý Mùi / giờ và âm dương'),
 c('dinh-dau','2017-08-01','Nam',12,15,2026,'Đinh Dậu / an sao năm sinh'),
 c('mau-tuat','2018-04-19','Nữ',14,55,2026,'Mậu Tuất / vị trí Thân'),
 c('at-hoi','1995-03-22','Nam',2,35,2026,'Ất Hợi / Tiểu hạn'),
 c('binh-ty','1996-12-31','Nữ',17,45,2026,'Bính Tý / hạn theo năm'),
 c('nam-xua','1935-11-12','Nam',9,45,1950,'Giai đoạn giờ địa phương lịch sử cần đối chiếu'),
 c('canh-cuoi-dai','2099-06-01','Nữ',1,25,2100,'Gần giới hạn 2100 của bộ lịch')
];
function view(chart,annual) {
  return {
    ruleSets:{core:chart.ruleSet,tuHoa:chart.tuHoaRuleSet,cycles:chart.cycles.ruleSet,advanced:chart.advancedStarRuleSet,tieuHan:annual.tieuHan.ruleSet},
    solar:chart.solar,lunar:chart.lunar,gender:chart.gender,hour:chart.hour,minute:chart.minute,yearCanChi:chart.yearCanChi,
    menh:chart.menh,than:chart.than,thanPalace:chart.thanPalace,cuc:chart.cuc.name,ziWei:chart.ziWei,thienPhu:chart.thienPhu,
    houses:chart.houses.map(h=>({branchIndex:h.branchIndex,palace:h.palace,branch:h.branch,isThan:h.isThan,
      stars:h.stars,auxiliaryStars:h.auxiliaryStars,yearStars:h.yearStars,additionalStars:h.additionalStars,advancedStars:h.advancedStars,obstructionMarkers:h.obstructionMarkers,
      tuHoa:h.tuHoa,cycleStars:h.cycleStars,daiHan:h.daiHan})),
    annual:{year:annual.year,canChi:annual.canChi,ageMu:annual.ageMu,tieuHan:annual.tieuHan,activeDaiHan:annual.activeDaiHan,luuThaiTueBranch:annual.luuThaiTueBranch,
      // Annual overlays are deliberately checked without the potentially variable display text.
      annualStars:annual.annualStars??null,luuStars:annual.luuStars?{ruleSet:'aux-nine-v4.0 + year-branch-five-v6.0',items:annual.luuStars.items.filter(x=>!['Lưu Tang Môn','Lưu Bạch Hổ','Lưu Thiên Khốc','Lưu Thiên Hư'].includes(x.name))}:null,luuTuHoa:annual.luuTuHoa??null}
  };
}
function generate() {
  return {
    schemaVersion:'1.0.0',release:'11.12.0',status:'engine-regression-only',expertReviewed:false,
    warning:'Chỉ là đầu ra đã ghim của engine, không phải bộ lá số chuẩn đã được chuyên gia đối chiếu độc lập. Không kết luận đúng sai trường phái.',
    cases:CASES.map(x=>{const chart=Engine.calculate(x.input);return {...x,expected:view(chart,Engine.annualOverview(chart,x.annualYear))};})
  };
}
function verify() {
  const expected=JSON.parse(fs.readFileSync(outfile,'utf8'));
  const actual=generate();
  assert.deepStrictEqual(actual,expected,'Engine thay đổi đầu ra; cần xem diff, đối chiếu chuyên môn trước khi chấp nhận cập nhật baseline');
  return {status:'PASS',caseCount:expected.cases.length,expertReviewed:false};
}
module.exports={CASES,view,generate,verify,outfile};
if(require.main===module){
  if(process.argv.includes('--write')){
    fs.writeFileSync(outfile,JSON.stringify(generate(),null,2)+'\n');
    console.log(`Created engine-only baselines at ${outfile}. Expert verification NOT claimed.`);
  }else{
    try{console.log(JSON.stringify(verify()));}
    catch(e){console.error(e.message);process.exitCode=1;}
  }
}
