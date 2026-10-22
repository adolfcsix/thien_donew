'use strict';
/** V11.142 — Reproducible Bát Tự INPUT only. No client-authored computed charts.
 * This method is fixed to Vietnamese civil UTC+07:00, with NO longitude correction.
 * Historical timezone and exact Jie boundaries remain separate research questions.
 */
const BaZi = require('./bazi.js');
const METHOD_ID = 'bazi-civil-time-utc7-v11.142';
const SCHEMA_VERSION = 1;
const OFFSET_MINUTES = 420;
function validateBaziSnapshot(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('Snapshot Bát Tự không hợp lệ');
 const s=raw;
 if(s.schemaVersion!==SCHEMA_VERSION||s.methodId!==METHOD_ID ||
    s.coreRuleSet!==BaZi.RULESET ||s.daYunRuleSet!==BaZi.DA_YUN_RULESET ||
    s.utcOffsetMinutes!==OFFSET_MINUTES ||s.timeZone!=='Asia/Ho_Chi_Minh' ||
    s.solarTimeCorrection!==false)throw new RangeError('Phiên bản và phương pháp Bát Tự chưa được hỗ trợ');
 if(typeof s.date!=='string'||typeof s.hour!=='number'||typeof s.minute!=='number'||
    !['midnight','late-zi'].includes(s.dayBoundary)||!['male','female'].includes(s.sex))
    throw new RangeError('Thời điểm hoặc quy tắc Đại Vận không hợp lệ');
 // Existing engine owns the calendar/date-range, leap day, hour and minute checks.
 BaZi.calculate({date:s.date,hour:s.hour,minute:s.minute,dayBoundary:s.dayBoundary});
 BaZi.daYun({date:s.date,hour:s.hour,minute:s.minute,dayBoundary:s.dayBoundary,sex:s.sex});
 // Never persist extra fields such as client-generated conclusions or decoded profile data.
 return Object.freeze({schemaVersion:SCHEMA_VERSION,methodId:METHOD_ID,
   coreRuleSet:BaZi.RULESET,daYunRuleSet:BaZi.DA_YUN_RULESET,
   date:s.date,hour:s.hour,minute:s.minute,dayBoundary:s.dayBoundary,sex:s.sex,
   utcOffsetMinutes:OFFSET_MINUTES,timeZone:'Asia/Ho_Chi_Minh',solarTimeCorrection:false});
}
function createBaziSnapshot(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Thiếu đầu vào Bát Tự');
 return validateBaziSnapshot({...input,schemaVersion:SCHEMA_VERSION,methodId:METHOD_ID,
   coreRuleSet:BaZi.RULESET,daYunRuleSet:BaZi.DA_YUN_RULESET,
   utcOffsetMinutes:OFFSET_MINUTES,timeZone:'Asia/Ho_Chi_Minh',solarTimeCorrection:false});
}
module.exports=Object.freeze({METHOD_ID,SCHEMA_VERSION,OFFSET_MINUTES,validateBaziSnapshot,createBaziSnapshot});
