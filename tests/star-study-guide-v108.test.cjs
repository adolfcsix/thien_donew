'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname,'..');
const data = require('../packages/knowledge/src/star-study-guide.json');
const strength = require('../packages/astrology-engine/src/star-strength.js');
const tuvi = require('../packages/astrology-engine/src/tuvi.js');
const read = relative => fs.readFileSync(path.join(ROOT,relative),'utf8');
const HOUSE_NAMES = ['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];

test('star study editorial data cover exactly the 14 main stars in the engine', () => {
  assert.deepEqual(new Set(Object.keys(data.stars)), new Set(strength.NAMES));
  assert.equal(Object.keys(data.stars).length,14);
  for (const [name,entry] of Object.entries(data.stars)) {
    assert.ok(strength.NAMES.includes(name),name);
    assert.deepEqual(Object.keys(entry).sort(), ['caution','crossCheck','motif','study'].sort());
    for(const [field,text] of Object.entries(entry)) assert.ok(typeof text==='string' && text.trim().length>(field==='motif'?12:38),`${name}.${field} is too short`);
  }
});

test('12 contextual palaces cover exactly the 12 real chart palace names', () => {
  assert.deepEqual(Object.keys(data.palaces),HOUSE_NAMES);
  const sample=tuvi.calculate({date:'2004-08-15',calendar:'solar',leap:false,gender:'Nam',hour:8,minute:30});
  assert.deepEqual(new Set(sample.houses.map(h=>h.palace)),new Set(HOUSE_NAMES));
  for(const [name,entry] of Object.entries(data.palaces)) {
    assert.deepEqual(Object.keys(entry).sort(),['scope','question','crossCheck','caution'].sort());
    for(const [field,text] of Object.entries(entry)) assert.ok(typeof text==='string' && text.trim().length>36,`${name}.${field} is too short`);
  }
});

test('study aids cover 168 star/palace pairings but do not forge 168 calculation rules', () => {
  const pairs=new Set();
  for (const star of Object.keys(data.stars)) for(const palace of Object.keys(data.palaces)) pairs.add(`${star}\0${palace}`);
  assert.equal(pairs.size,168);
  assert.equal(strength.matrix().length,14);
  assert.match(data.disclaimer,/không phải luận đoán/i);
  assert.match(data.edition,/^star-study-v\d+-/);
});

test('deep links preserve accented star/palace and exact 0-11 branch index', () => {
  for(const star of Object.keys(data.stars)) for(const palace of HOUSE_NAMES) {
    const url=new URL(`/star-atlas?star=${encodeURIComponent(star)}&branch=11&palace=${encodeURIComponent(palace)}`,'https://thiendo.example');
    assert.equal(url.searchParams.get('star'),star);
    assert.equal(url.searchParams.get('palace'),palace);
    assert.equal(url.searchParams.get('branch'),'11');
    assert.equal(strength.lookup(star,Number(url.searchParams.get('branch'))).branchName,'Hợi');
  }
  for(const value of ['-1','12','01','1.5','NaN','a','0%20','undefined',''])
    assert.equal(/^(?:[0-9]|1[01])$/.test(value),false,value);
});

test('chart integration has one click-through per displayed main star and does not nest links inside tiles', () => {
  const board=read('apps/web/src/features/chart/components/palace-details.tsx');
  assert.match(board,/import Link from 'next\/link'/);
  assert.match(board,/house\.stars\.map\(star => <Link/);
  assert.match(board,/star=\$\{encodeURIComponent\(star\)\}/);
  assert.match(board,/branch=\$\{house\.branchIndex\}/);
  assert.match(board,/palace=\$\{encodeURIComponent\(house\.palace\)\}/);
  assert.ok(board.indexOf('atlas-study-card')>board.indexOf('function PalaceDetails('));
  assert.match(read('apps/web/src/features/chart/components/chart-board.tsx'), /<PalaceDetails house=/);
  assert.doesNotMatch(read('apps/web/src/features/chart/components/palace-tile.tsx'), /<Link /);
});

test('atlas validates deep links, separates editorial notes from engine, and exposes scoped research', () => {
  const atlas=read('apps/web/src/app/star-atlas/page.tsx');
  assert.match(atlas,/import studyGuide from '@thiendo\/knowledge\/src\/star-study-guide.json'/);
  assert.match(atlas,/new URLSearchParams\(window.location.search\)/);
  assert.match(atlas,/Object\.prototype\.hasOwnProperty\.call\(studyStars,incomingStar\)/);
  assert.match(atlas,/Object\.prototype\.hasOwnProperty\.call\(studyPalaces,incomingPalace\)/);
  assert.match(atlas,/\^\(\?:\[0-9\]\|1\[01\]\)\$/);
  for (const item of ['studiedStar.caution','studiedPalace.caution','studiedStar.crossCheck','studiedPalace.crossCheck','aria-label="Chọn cung chức','Quy trình đọc có trách nhiệm']) assert.ok(atlas.includes(item),item);
  const css=read('apps/web/src/app/star-atlas/star-atlas.css');
  assert.match(css,/\.star-study-grid/);
  assert.match(css,/@media\(max-width:700px\)/);
});

test('study guide is distinct from calculation engine and original placement remains valid', () => {
  const engine=read('packages/astrology-engine/src/tuvi.js');
  const strengthFile=read('packages/astrology-engine/src/star-strength.js');
  assert.doesNotMatch(engine,/star-study-guide/);
  assert.doesNotMatch(strengthFile,/star-study-guide/);
  const sample=tuvi.calculate({date:'2004-08-15',calendar:'solar',leap:false,gender:'Nam',hour:8,minute:30});
  assert.equal(sample.houses.reduce((n,house)=>n+house.stars.length,0),14);
  assert.equal(sample.mainStarStrengthRuleSet,strength.RULESET);
});
