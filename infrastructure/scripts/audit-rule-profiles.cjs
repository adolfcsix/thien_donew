'use strict';
/**
 * Internal-only rule-profile inventory. No frontend import, no source links in UI.
 * This records implemented choices and flags alternatives for expert review;
 * it DOES NOT simulate an unimplemented astrological school.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const registry = require('../rules/rule-profiles.v1112.json');
const Engine = require('../../packages/astrology-engine/src/tuvi.js');
const Cycle = require('../../packages/astrology-engine/src/cycles.js');
const TuHoa = require('../../packages/astrology-engine/src/tuhoa.js');
const Advanced = require('../../packages/astrology-engine/src/advanced-placements.js');
const Annual = require('../../packages/astrology-engine/src/annual.js');

const implementations = Object.freeze({
  'tieu-han': Annual.TIEU_HAN_RULESET,
  'trang-sinh': Cycle.RULESET,
  'tu-hoa': TuHoa.RULESET,
  'sat-tinh-mo-rong': Advanced.RULESET,
  'chuyen-ngay-gio-ty': 'birth-civil-date-hour23-v6.0',
  'thang-nhuan': 'birth-leap-month-same-ordinal-v6.0',
});

function auditRuleProfiles() {
  const errors = [];
  const ids = new Set();
  if (registry.schemaVersion !== '1.0.0') errors.push('schemaVersion không được hỗ trợ');
  if (registry.editorialStatus !== 'pending-independent-expert-validation') errors.push('Không được đánh dấu đã thẩm định khi chưa có bằng chứng độc lập');
  for (const profile of registry.profiles || []) {
    if (ids.has(profile.id)) errors.push(`Mã bị trùng: ${profile.id}`);
    ids.add(profile.id);
    if (!(profile.id in implementations)) errors.push(`Mã chưa biết: ${profile.id}`);
    if (implementations[profile.id] !== profile.selectedRuleSet) errors.push(`RuleSet sai khác ở ${profile.id}`);
    if (!profile.requiresExpertReview || !Array.isArray(profile.alternatives) || !profile.alternatives.length) errors.push(`Thiếu thông tin dị bản: ${profile.id}`);
    if (!profile.internalReference || !fs.existsSync(path.join(root, profile.internalReference))) errors.push(`Đường dẫn kiểm toán nội bộ sai: ${profile.id}`);
  }
  for (const id of Object.keys(implementations)) if (!ids.has(id)) errors.push(`Thiếu profile: ${id}`);
  const sample = Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:23});
  const annual = Engine.annualOverview(sample,2026);
  if (sample.tuHoaRuleSet !== implementations['tu-hoa']) errors.push('RuleSet Tứ Hóa không khớp output');
  if (sample.advancedStarRuleSet !== implementations['sat-tinh-mo-rong']) errors.push('RuleSet sao nâng cao không khớp output');
  if (sample.cycles.ruleSet !== implementations['trang-sinh']) errors.push('RuleSet Tràng Sinh không khớp output');
  if (annual.tieuHan.ruleSet !== implementations['tieu-han']) errors.push('RuleSet Tiểu hạn không khớp output');
  if (!sample.warnings.some(x=>x.includes('23:00–23:59'))) errors.push('Chưa cảnh báo cách chuyển ngày giờ Tý');
  const leap = Engine.calculate({date:'2025-07-27',calendar:'solar',gender:'Nữ',hour:10});
  if (!leap.lunar.leap || !leap.warnings.some(x=>x.includes('nhuận'))) errors.push('Chưa cảnh báo quy ước tháng nhuận');
  return {status:errors.length?'BLOCKED':'PASS',profileCount:ids.size,expertVerified:0,alternativeRulesImplemented:0,errors};
}
module.exports = {auditRuleProfiles, implementations};
if (require.main === module) {
  const report = auditRuleProfiles();
  console.log(JSON.stringify(report,null,2));
  if (report.status !== 'PASS') process.exitCode=1;
}
