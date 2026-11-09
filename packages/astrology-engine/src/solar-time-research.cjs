'use strict';
/**
 * Thiên Đồ — optional true-solar-time sensitivity study.
 * NOAA fractional-year equation-of-time approximation. This is NOT a replacement
 * for a verified historical time-zone conversion or the production Tử Vi engine.
 * The caller supplies the standard UTC offset, never a guessed DST adjustment.
 */
const RULESET = 'tuvi-solar-time-sensitivity-v1';
const BRANCHES = Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const pad = value => String(value).padStart(2, '0');
const branchIndex = hour => Math.floor((hour + 1) / 2) % 12;

function parseDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new RangeError('Ngày dương lịch phải có dạng YYYY-MM-DD.');
  const [year, month, day] = date.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  if (year < 1900 || year > 2100 || !Number.isFinite(utc) ||
      new Date(utc).toISOString().slice(0, 10) !== date)
    throw new RangeError('Ngày dương lịch không hợp lệ hoặc ngoài 1900–2100.');
  return {year, month, day, utc};
}

function assess(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new TypeError('Cần thông tin sinh dưới dạng đối tượng.');
  const {date, hour, minute = 0, longitude, utcOffsetMinutes = 420} = input;
  const parsed = parseDate(date);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59)
    throw new RangeError('Giờ hoặc phút sinh không hợp lệ.');
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    throw new RangeError('Kinh độ phải là số từ −180 đến 180.');
  if (!Number.isInteger(utcOffsetMinutes) || utcOffsetMinutes < -720 || utcOffsetMinutes > 840)
    throw new RangeError('Độ lệch UTC tiêu chuẩn phải trong −12 đến +14 giờ.');

  const leap = parsed.year % 4 === 0 && (parsed.year % 100 !== 0 || parsed.year % 400 === 0);
  const dayOfYear = 1 + Math.floor((parsed.utc - Date.UTC(parsed.year, 0, 1)) / 86400000);
  const gamma = 2 * Math.PI / (leap ? 366 : 365) * (dayOfYear - 1 + (hour - 12) / 24);
  const equationOfTimeMinutes = 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );
  const standardMeridian = utcOffsetMinutes / 4; // 15° for each UTC hour
  const longitudeCorrectionMinutes = 4 * (longitude - standardMeridian);
  const correctionMinutes = longitudeCorrectionMinutes + equationOfTimeMinutes;
  const totalSeconds = Math.round(((hour * 60 + minute) + correctionMinutes) * 60);
  const dayOffset = Math.floor(totalSeconds / 86400);
  const withinDay = totalSeconds - dayOffset * 86400;
  const correctedHour = Math.floor(withinDay / 3600);
  const correctedMinute = Math.floor(withinDay % 3600 / 60);
  const correctedSecond = withinDay % 60;
  const correctedDate = new Date(parsed.utc + dayOffset * 86400000).toISOString().slice(0, 10);
  const clockBranch = BRANCHES[branchIndex(hour)];
  const solarBranch = BRANCHES[branchIndex(correctedHour)];
  const boundaryMinutes = [60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140, 1260, 1380];
  const correctedClockMinutes = withinDay / 60;
  const nearestBoundaryMinutes = Math.min(...boundaryMinutes.map(b => Math.min(
    Math.abs(correctedClockMinutes - b), 1440 - Math.abs(correctedClockMinutes - b)
  )));

  return Object.freeze({
    ruleSet: RULESET,
    clock: Object.freeze({date, hour, minute, branch: clockBranch}),
    corrected: Object.freeze({date: correctedDate, hour: correctedHour, minute: correctedMinute,
      second: correctedSecond, branch: solarBranch}),
    utcOffsetMinutes, longitude, standardMeridian,
    longitudeCorrectionMinutes, equationOfTimeMinutes, correctionMinutes,
    dayOffset, branchChanged: clockBranch !== solarBranch,
    nearBranchBoundary: nearestBoundaryMinutes <= 15,
    boundaryDistanceMinutes: Math.round(nearestBoundaryMinutes * 10) / 10,
    precision: 'NOAA-fractional-year-approximation',
    note: 'Chỉ để đối chiếu trường phái; chưa xác minh giờ lịch sử, DST hay lịch pháp địa phương. Không tự động thay đầu vào lá số.'
  });
}

module.exports = Object.freeze({RULESET, BRANCHES, assess});

