/**
 * Lục Hào V11.74 · ngữ cảnh Nhật thần, Nguyệt kiến và Tuần Không.
 * Mặc định Can Chi ngày từ lịch dân dụng (đổi ngày tại 00:00 UTC+7),
 * Nguyệt kiến theo tiết Lập Xuân/Kinh Trập/... ước lượng lúc 12:00 VN.
 * Không xem đây là thời điểm nhập tiết thiên văn được kiểm chứng.
 */
'use strict';
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const XUN_NAMES=Object.freeze(['Giáp Tý','Giáp Tuất','Giáp Thân','Giáp Ngọ','Giáp Thìn','Giáp Dần']);
const mod=(n,m)=>((n%m)+m)%m;
function requireStem(stem){if(!STEMS.includes(stem))throw new RangeError('Nhật can phải là một trong 10 Thiên Can.');return STEMS.indexOf(stem);}
function requireBranch(branch,name){if(!BRANCHES.includes(branch))throw new RangeError(`${name} phải thuộc 12 Địa Chi.`);return BRANCHES.indexOf(branch);}
function xunVoid(dayStem,dayBranch){
 const stemIndex=requireStem(dayStem), branchIndex=requireBranch(dayBranch,'Nhật chi');
 if(stemIndex%2!==branchIndex%2)throw new RangeError('Can Chi ngày trái luật âm dương (sai chẵn/lẻ).');
 const jiaBranch=mod(branchIndex-stemIndex,12);
 const xunIndex=[0,10,8,6,4,2].indexOf(jiaBranch);
 if(xunIndex<0)throw new Error('Không xác định được tuần Giáp của Can Chi ngày.');
 return Object.freeze({xun:XUN_NAMES[xunIndex],voidBranches:Object.freeze([BRANCHES[(jiaBranch+10)%12],BRANCHES[(jiaBranch+11)%12]]),jiaBranch:BRANCHES[jiaBranch],xunIndex});
}
function calendarContext(dayInfo){
 if(!dayInfo||typeof dayInfo!=='object'||!/^\d{4}-\d{2}-\d{2}$/.test(dayInfo.solar?.iso||''))throw new TypeError('Cần dữ liệu calendarDay hợp lệ của engine lịch pháp.');
 const dayTokens=dayInfo.dayCanChi?.split(' '),monthTokens=dayInfo.monthCanChi?.name?.split(' ');
 if(dayTokens?.length!==2||monthTokens?.length!==2)throw new TypeError('Can Chi ngày/tháng phải có đủ Thiên Can và Địa Chi.');
 const [dayStem,dayBranch]=dayTokens,monthBranch=monthTokens[1];
 requireBranch(monthBranch,'Nguyệt kiến');
 const xun=xunVoid(dayStem,dayBranch);
 const needsMonthVerification=Boolean(dayInfo.monthCanChi.nearBoundary||dayInfo.solarTerm?.nearBoundary);
 return Object.freeze({source:'calendar-utc7-noon-approx',date:dayInfo.solar.iso,
  dayStem,dayBranch,monthBranch:needsMonthVerification?null:monthBranch,
  suggestedMonthBranch:monthBranch,needsMonthVerification,
  solarTerm:dayInfo.solarTerm?.name||null,dayCanChi:dayInfo.dayCanChi,
  monthCanChi:dayInfo.monthCanChi.name,...xun,
  warnings:Object.freeze([
   'Can Chi ngày lấy theo ngày dân dụng Việt Nam đổi ngày lúc 00:00; chưa áp dụng đổi ngày từ giờ Tý.',
   'Nguyệt kiến theo vị trí Mặt Trời ước tính lúc 12:00 Việt Nam, không phải giờ nhập tiết chính xác.',
   ...(needsMonthVerification?['Gần chuyển tiết: ngừng suy quan hệ hào với Nguyệt kiến cho tới khi xác minh thời điểm nhập tiết.']:[]),
  ])});
}
function manualContext({dayStem,dayBranch,monthBranch}){
 const xun=xunVoid(dayStem,dayBranch);requireBranch(monthBranch,'Nguyệt kiến');
 return Object.freeze({source:'user-verified-manual',date:null,dayStem,dayBranch,monthBranch,suggestedMonthBranch:monthBranch,
  needsMonthVerification:false,solarTerm:null,dayCanChi:`${dayStem} ${dayBranch}`,monthCanChi:null,...xun,
  warnings:Object.freeze(['Dữ liệu Can Chi nhập thủ công: cần xác minh đúng ngày, giờ đổi ngày và tháng theo tiết khí.'])});
}
module.exports={STEMS,BRANCHES,XUN_NAMES,xunVoid,calendarContext,manualContext};
