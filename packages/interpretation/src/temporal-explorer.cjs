'use strict';
/**
 * THIÊN ĐỒ V11.21: calendar-accurate selection INSIDE the audited annual layer.
 * Does not place monthly/daily/hourly Tử Vi stars. Month/day/hour are factual
 * lunisolar calendar metadata and a selected earthly-branch time window only.
 */
const Lunar = require('../../astrology-engine/src/lunar.js');
const Almanac = require('../../astrology-engine/src/almanac.js');
const { comparePeriods } = require('./period-timeline.cjs');
const { calculateSubannualBranches } = require('../../astrology-engine/src/subannual-placements.js');

const RULESET = 'thiendo-temporal-calendar-explorer-v11.21';
const BRANCHES = Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
function iso(date) { return `${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`; }
function assertLunarYear(year) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new RangeError('Năm âm lịch phải thuộc 1900–2100');
}
// Private cache has at most 201 supported years; callers receive independent copies.
const monthCache=new Map();
const copyMonths=months=>months.map(month=>({...month,days:month.days.map(day=>({...day}))}));
function listLunarMonths(year) {
  assertLunarYear(year);
  if(monthCache.has(year))return copyMonths(monthCache.get(year));
  const result=[];
  for(let m=1;m<=12;m++) for (const leap of [false,true]) {
    let first;
    try { first=Lunar.lunarToSolar(year,m,1,leap); }
    catch (error) { if(error instanceof RangeError) continue; throw error; }
    const days=[];
    for(let d=1;d<=30;d++) {
      try {
        const date=Lunar.lunarToSolar(year,m,d,leap);
        days.push({lunarDay:d,solarDate:iso(date)});
      } catch (error) { if(error instanceof RangeError) break; throw error; }
    }
    if(days.length===0) continue;
    // 2100 is the supported conversion boundary. Never pretend that a month
    // with future dates outside supported range is fully enumerated.
    result.push({key:`${m}-${Number(leap)}`,month:m,leap,displayName:`Tháng ${m}${leap?' nhuận':''}`,firstSolarDate:iso(first),days,partial:days.length<29});
  }
  // Keep leap month immediately following its regular month.
  monthCache.set(year,copyMonths(result));
  return result;
}
function getHourBranch(hour) {
  if(!Number.isInteger(hour)||hour<0||hour>23) throw new RangeError('Giờ xem phải thuộc 0–23');
  const branchIndex=Math.floor(((hour+1)%24)/2);
  return {hour,branchIndex,branch:BRANCHES[branchIndex],period:branchIndex===0?'23:00–00:59':`${String(branchIndex*2-1).padStart(2,'0')}:00–${String(branchIndex*2).padStart(2,'0')}:59`,boundaryNotice:hour===23?'Giờ Tý bắt đầu lúc 23:00. Cách đổi ngày ở giờ Tý có dị bản; bản này không tự đổi ngày sinh hoặc gán vận giờ.':null};
}
function getTemporalExplorer(chart,year,month=1,leap=false,day=1,hour=12) {
  // Enforce the same birth-year/range rules as the annual view.
  const annual=comparePeriods(chart,year,1).selected;
  const months=listLunarMonths(year);
  if (!Number.isInteger(month)||month<1||month>12||typeof leap!=='boolean')throw new RangeError('Tháng âm hoặc cờ tháng nhuận không hợp lệ');
  const selectedMonth=months.find(item=>item.month===month&&item.leap===leap);
  if(!selectedMonth)throw new RangeError('Tháng âm không tồn tại trong năm hoặc ngoài phạm vi lịch hỗ trợ');
  if(!Number.isInteger(day)||day<1||day>selectedMonth.days.length)throw new RangeError('Ngày âm không tồn tại trong tháng đã chọn');
  const solarDate=selectedMonth.days[day-1].solarDate;
  const [sy,sm,sd]=solarDate.split('-').map(Number);
  const almanac=Almanac.dayInfo(sy,sm,sd);
  if(almanac.lunar.year!==year||almanac.lunar.month!==month||almanac.lunar.day!==day||almanac.lunar.leap!==leap)throw new Error('Phép đổi ngày âm/dương không nhất quán');
  const time=getHourBranch(hour);
  return {
    ruleSet:RULESET,year,months,
    selected:{month,leap,day,hour,monthKey:selectedMonth.key,solarDate,lunarLabel:`${day}/${month}${leap?' nhuận':''}/${year}`,dayCanChi:almanac.dayCanChi,yearCanChi:almanac.yearCanChi,time},
    annual:{canChi:annual.canChi,ageMu:annual.ageMu,daiHan:annual.daiHan,tieuHan:annual.tieuHan,luuThaiTue:annual.luuThaiTue},
    coverage:{calendarConversion:true,lunarLeapMonth:true,dayCanChi:true,earthlyBranchHour:true,annualPeriod:true,luuNguyet:false,luuNhat:false,luuThoi:false},
    note:'Tháng, ngày và giờ ở đây là mốc thời gian để tra cứu, KHÔNG phải vị trí Lưu nguyệt, Lưu nhật hoặc Lưu thời. Chỉ các dấu vận năm đã được engine tính mới được dùng để đối chiếu.'
  };
}
function getSubannualResearch(chart,year,month=1,leap=false,day=1,hour=12){
  // Mandatory calendar validation: reject impossible lunar days and leap months.
  getTemporalExplorer(chart,year,month,leap,day,hour);
  return calculateSubannualBranches(chart,{year,month,leap,day,hour});
}
module.exports=Object.freeze({RULESET,listLunarMonths,getHourBranch,getTemporalExplorer,getSubannualResearch});
