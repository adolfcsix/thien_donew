'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const SolarTime = require('../packages/astrology-engine/src/solar-time-research.cjs');

test('UTC+7 có kinh tuyến chuẩn 105°E', () => {
  const result = SolarTime.assess({date:'2026-06-20',hour:11,minute:30,longitude:105});
  assert.equal(result.standardMeridian,105); // UTC+7 standard meridian
  assert.equal(result.longitudeCorrectionMinutes,0);
  assert.equal(result.clock.branch,'Ngọ');
  assert.equal(result.corrected.branch,'Ngọ');
});

test('đổi cung giờ khi sinh phía tây kinh tuyến chuẩn', () => {
  const result = SolarTime.assess({date:'2026-06-20',hour:11,minute:30,longitude:90});
  assert.equal(result.longitudeCorrectionMinutes,-60);
  assert.equal(result.clock.branch,'Ngọ');
  assert.equal(result.corrected.branch,'Tỵ');
  assert.equal(result.branchChanged,true);
});

test('giờ gần 00h có thể vượt sang ngày hôm trước mà không sửa giờ gốc', () => {
  const source={date:'2026-06-20',hour:0,minute:20,longitude:90};
  const result=SolarTime.assess(source);
  assert.equal(source.date,'2026-06-20');
  assert.equal(result.corrected.date,'2026-06-19');
  assert.equal(result.dayOffset,-1);
});

test('kinh tuyến tiêu chuẩn phụ thuộc vào offset địa phương thay vì luôn UTC+7', () => {
  const result=SolarTime.assess({date:'2026-06-20',hour:14,minute:0,longitude:-75,utcOffsetMinutes:-300});
  assert.equal(result.standardMeridian,-75);
  assert.equal(result.longitudeCorrectionMinutes,0);
});

test('chặn ngày, múi giờ và kinh độ sai', () => {
  const base={date:'2026-02-28',hour:12,minute:0,longitude:105};
  for (const data of [{date:'2026-02-30'},{longitude:181},{longitude:NaN},
    {utcOffsetMinutes:900},{hour:24},{minute:60},{date:'1899-12-31'}]) {
    assert.throws(()=>SolarTime.assess({...base,...data}),RangeError);
  }
});

