'use strict';
/**
 * V11.93 BaZi time convention research. Isolated: no production engine replacement.
 * Time of year/month pillars = birth UTC instant, not longitude-adjusted wall-clock.
 * Day/hour pillars = selected civil/mean/apparent-solar clock + selected day boundary.
 * NOAA EOT is an approximation and cannot certify Jie boundary precision.
 */
const BaZi = require('./bazi.js');
const Lunar = require('./lunar.js');

const RULESET = 'bazi-local-time-jie-and-noaa-eot-research-v11.93';
const MODES = Object.freeze(['civil', 'mean-solar', 'apparent-solar']);
const DAY_BOUNDARIES = Object.freeze(['midnight', 'late-zi']);
const MINUTE_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;
const SCOPE = '1901–2099; exact numeric historical UTC offset supplied by researcher';
const pad = number => String(number).padStart(2, '0');
const mod = (a, n) => ((a % n) + n) % n;
const stamp = ms => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const partsAt = ms => {
  const d = new Date(ms);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    hour: d.getUTCHours(), minute: d.getUTCMinutes(),
  };
};
function assertInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Đầu vào phải là đối tượng');
  const {date, hour, minute = 0, utcOffsetMinutes, longitudeDeg, timeMode = 'civil', dayBoundary = 'midnight'} = input;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError('Ngày phải là YYYY-MM-DD');
  const [year,month,day] = date.split('-').map(Number);
  if (year < 1901 || year > 2099 || !Lunar.validSolar(year,month,day)) throw new RangeError('Ngày không hợp lệ hoặc ngoài phạm vi 1901–2099');
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new RangeError('Giờ/phút không hợp lệ');
  if (!Number.isInteger(utcOffsetMinutes) || utcOffsetMinutes < -720 || utcOffsetMinutes > 840) throw new RangeError('Yêu cầu UTC offset lịch sử cụ thể, -720..+840 phút');
  if (typeof longitudeDeg !== 'number' || !Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) throw new RangeError('Kinh độ phải hữu hạn trong -180..180');
  if (!MODES.includes(timeMode)) throw new RangeError('Chế độ thời gian không hợp lệ');
  if (!DAY_BOUNDARIES.includes(dayBoundary)) throw new RangeError('Quy ước đổi ngày không hợp lệ');
  const localMs = Date.UTC(year,month-1,day,hour,minute);
  return {date,hour,minute,utcOffsetMinutes,longitudeDeg,timeMode,dayBoundary,localMs,utcMs:localMs-utcOffsetMinutes*MINUTE_MS};
}
/** NOAA fractional-year approximation, not VSOP87 ephemeris.
 * Uses UTC instant; equation-of-time error / applicability is documented.
 */
function equationOfTimeNoaa(utcMs) {
  if (!Number.isFinite(utcMs) || utcMs < Date.UTC(1901,0,1) || utcMs >= Date.UTC(2101,0,1)) throw new RangeError('UTC instant outside supported research dates');
  const d = new Date(utcMs);
  const year = d.getUTCFullYear();
  const start = Date.UTC(year,0,1);
  const ordinal = Math.floor((Date.UTC(year,d.getUTCMonth(),d.getUTCDate())-start)/DAY_MS)+1;
  const leap = (year%4===0 && (year%100!==0 || year%400===0));
  const hour = d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600+d.getUTCMilliseconds()/HOUR_MS;
  const gamma = 2*Math.PI/(leap?366:365)*(ordinal-1+(hour-12)/24);
  return 229.18 * (0.000075 + 0.001868*Math.cos(gamma)-0.032077*Math.sin(gamma)-0.014615*Math.cos(2*gamma)-0.040849*Math.sin(2*gamma));
}
/** Unwrap longitude near the timezone meridian: e.g. +179 / UTC-12 becomes -181°.
 * This avoids a spurious one-day correction at the date line.
 */
function solarTimeCorrection({utcMs, utcOffsetMinutes, longitudeDeg, timeMode}) {
  if (!MODES.includes(timeMode)) throw new RangeError('Chế độ thời gian không hợp lệ');
  if (!Number.isFinite(utcMs) || !Number.isInteger(utcOffsetMinutes) || utcOffsetMinutes < -720 || utcOffsetMinutes > 840 || !Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) throw new RangeError('Thiếu tọa độ, UTC offset hoặc thời điểm hợp lệ');
  const meridianDeg = utcOffsetMinutes/4;
  const unwrappedLongitudeDeg = longitudeDeg + 360*Math.round((meridianDeg-longitudeDeg)/360);
  const longitudeCorrectionMinutes = 4*(unwrappedLongitudeDeg-meridianDeg);
  const equationOfTimeMinutes = timeMode==='apparent-solar'?equationOfTimeNoaa(utcMs):0;
  return Object.freeze({meridianDeg,unwrappedLongitudeDeg,
    longitudeCorrectionMinutes:timeMode==='civil'?0:longitudeCorrectionMinutes,
    equationOfTimeMinutes, correctionMinutes:timeMode==='civil'?0:longitudeCorrectionMinutes+equationOfTimeMinutes});
}
function pillarFrom(base, key, dayStemIndex) {
  const p=base.pillars[key];
  const tenGod = key==='day'?null:BaZi.tenGod(dayStemIndex,p.stemIndex);
  return {...p,tenGod,hiddenStems:BaZi.hiddenStems(p.branchIndex,dayStemIndex)};
}
function clockDistanceToRollover(minutesOfDay,dayBoundary) {
  const dayStart=dayBoundary==='late-zi'?1380:0;
  return Math.min(mod(minutesOfDay-dayStart,1440),mod(dayStart-minutesOfDay,1440));
}
function clockDistanceToDoubleHour(minutesOfDay) {
  // Zi = 23:00–01:00, then all next branches start at odd hours.
  return Math.min(mod(minutesOfDay-60,120),mod(60-minutesOfDay,120));
}
function evaluate(input) {
  const x=assertInput(input);
  const correction=solarTimeCorrection(x);
  const effectiveMs=x.localMs+correction.correctionMinutes*MINUTE_MS;
  const localAsVnParts=partsAt(x.utcMs+7*HOUR_MS);
  // The existing engine uses a fixed +07 offset. Feed it a VN-local representation
  // of the actual UTC instant exclusively for year/month solar longitude.
  const actual=BaZi.calculate({...localAsVnParts,dayBoundary:'midnight'});
  // This second call supplies *only* day/hour; its computed year/month are discarded.
  // Round to the nearest minute to match the legacy minute-resolution engine.
  const roundedEffectiveMs=Math.round(effectiveMs/MINUTE_MS)*MINUTE_MS;
  const adjustedForPillars=partsAt(roundedEffectiveMs);
  const local=BaZi.calculate({...adjustedForPillars,dayBoundary:x.dayBoundary});
  const dayStem=local.pillars.day.stemIndex;
  const pillars=Object.freeze({
    year:pillarFrom(actual,'year',dayStem),month:pillarFrom(actual,'month',dayStem),
    day:pillarFrom(local,'day',dayStem),hour:pillarFrom(local,'hour',dayStem)
  });
  const minutesOfDay=mod((effectiveMs % DAY_MS)/MINUTE_MS,1440);
  const dayDistance=clockDistanceToRollover(minutesOfDay,x.dayBoundary);
  const hourDistance=clockDistanceToDoubleHour(minutesOfDay);
  // Existing solar longitude is a low-precision approximation. A conservative 2h
  // band around each month Jie is flagged, not asserted to be astronomical truth.
  const d=mod(actual.solarTerm.longitudeDeg-315,30);
  const jieArcDistanceDeg=Math.min(d,30-d);
  const jieReview=actual.solarTerm.nearBoundary || jieArcDistanceDeg < 0.1;
  const clockReview=Math.min(dayDistance,hourDistance)<5;
  const notes=[];
  if (jieReview) notes.push('Sát ranh giới 12 tiết Jie: trụ năm/tháng chỉ là tạm tính, cần đối chiếu thời khắc giao tiết thiên văn độc lập.');
  if (clockReview) notes.push('Sát ranh đổi ngày hoặc đổi chi giờ: cần xác nhận độ chính xác giờ sinh và quy ước áp dụng.');
  if (x.timeMode==='apparent-solar') notes.push('Phương trình thời gian theo xấp xỉ NOAA, không phải kết quả ephemeris chính xác đến giây.');
  if (x.utcOffsetMinutes !== 420) notes.push('UTC offset lịch sử được người nghiên cứu nhập trực tiếp; phần mềm không suy đoán múi giờ lịch sử theo địa danh.');
  if (Math.abs(correction.correctionMinutes)>120) notes.push('Hiệu chỉnh vượt 2 giờ: kiểm tra lại múi giờ lịch sử, kinh độ và quy ước ngày quốc tế.');
  if (x.hour===23 || adjustedForPillars.hour===23) notes.push('Quy ước 23:00 và 00:00 có thể cho trụ ngày khác nhau; cần so sánh theo trường phái.');
  const yearsMonthsValid=!jieReview;
  return Object.freeze({
    ruleSet:RULESET, researchOnly:true, status:(jieReview||clockReview)?'REVIEW_REQUIRED':'PROVISIONAL',
    input:Object.freeze({date:x.date,hour:x.hour,minute:x.minute,utcOffsetMinutes:x.utcOffsetMinutes,
      longitudeDeg:x.longitudeDeg,timeMode:x.timeMode,dayBoundary:x.dayBoundary}),
    timestamps:Object.freeze({localCivil:stamp(x.localMs),utc:new Date(x.utcMs).toISOString(),effective:stamp(roundedEffectiveMs)}),
    timeCorrection:correction,
    yearMonthSource:'original UTC instant',dayHourSource:x.timeMode==='civil'?'local civil clock':x.timeMode==='mean-solar'?'local mean solar clock':'local apparent solar clock (NOAA approximation)',
    pillars,dayMaster:Object.freeze({stem:pillars.day.stem,element:pillars.day.element,polarity:pillars.day.polarity}),
    relations:BaZi.detectRelations(pillars),
    solarTerm:Object.freeze({...actual.solarTerm, JieBoundaryStatus:yearsMonthsValid?'provisional':'review-required',jieArcDistanceDeg}),
    boundaryCheck:Object.freeze({dayDistanceMinutes:dayDistance,hourDistanceMinutes:hourDistance,withinFiveMinutes:clockReview,nearJie:jieReview}),
    notes:Object.freeze(notes),
    scope:SCOPE,
    disclaimer:'Phép tính Bát Tự theo trường phái nghiên cứu. Không phải xác nhận thiên văn chính xác, tư vấn hoặc dự đoán khoa học.'
  });
}
/** Compare all six combinations without changing legacy outputs or caching personal data. */
function compareConventions(input) {
  const base=assertInput(input);
  const cases=[];
  for(const timeMode of MODES)for(const dayBoundary of DAY_BOUNDARIES){
    const r=evaluate({...base,timeMode,dayBoundary});
    cases.push(Object.freeze({timeMode,dayBoundary,status:r.status,
      pillars:Object.freeze(Object.fromEntries(Object.entries(r.pillars).map(([key,p])=>[key,p.name]))),
      effective:r.timestamps.effective,correctionMinutes:r.timeCorrection.correctionMinutes}));
  }
  const differingPillars=Object.freeze(['year','month','day','hour'].filter(key=>new Set(cases.map(c=>c.pillars[key])).size>1));
  return Object.freeze({ruleSet:RULESET,researchOnly:true,cases:Object.freeze(cases),differingPillars,
    warning:'Chỉ so sánh quy ước nghiên cứu. Trụ năm/tháng là tạm tính gần giao Jie.'});
}
module.exports=Object.freeze({RULESET,MODES,DAY_BOUNDARIES,SCOPE,assertInput,equationOfTimeNoaa,solarTimeCorrection,evaluate,compareConventions});
