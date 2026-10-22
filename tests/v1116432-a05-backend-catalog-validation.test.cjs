'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {stringValue,offsetValue,literalLike}=require('../apps/api/src/common/catalog-query.cjs');
const root=path.resolve(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');

test('A05: HTTP query accepts legitimate search, Unicode and whitespace',()=>{
  assert.equal(stringValue({q:'  Tử Vi  '},'q',100),'Tử Vi');
  assert.equal(stringValue({},'q',100),'');
  assert.equal(offsetValue({},10000),0);
  assert.equal(offsetValue({offset:'20'},10000),20);
});

test('A05: repeated params, arrays, nested objects, controls and overlong search fail validation',()=>{
  for (const invalid of [{q:['tarot','bazi']},{q:{nested:true}},{q:7},{q:null},{q:'hi\u0000bye'},{q:'a'.repeat(101)},{q:'\t'}]) {
    assert.throws(()=>stringValue(invalid,'q',100),undefined,JSON.stringify(invalid));
  }
  for(const invalid of [null,[],1,'bad'])assert.throws(()=>stringValue(invalid,'q',100));
});

test('A05: offset is strictly parsed and bounded, without coercion',()=>{
  for(const raw of [['1','2'],{},null,1,'-1','1.0','1e3','10001','NaN','1 OR 1=1','9999999999999999']){
    assert.throws(()=>offsetValue({offset:raw},10000),undefined,JSON.stringify(raw));
  }
  assert.equal(offsetValue({offset:'10000'},10000),10000);
  assert.throws(()=>offsetValue({offset:'10001'},10000));
});

test('A05: LIKE treats percent, underscore, and escape character as literal query text',()=>{
  assert.equal(literalLike('100%_!'), '100!%!_!!');
  assert.equal(literalLike('Tử Vi'), 'Tử Vi');
});

test('A05: books and archive use shared validation and SQL literal matching',()=>{
  const book=source('apps/api/src/modules/books/books.service.ts');
  const archive=source('apps/api/src/modules/van-kho/van-kho.service.ts');
  for(const value of [book,archive]){
    assert.match(value,/stringValue\(/);
    assert.match(value,/offsetValue\(/);
    assert.match(value,/literalLike\(/);
    assert.match(value,/ESCAPE '!'/);
    assert.match(value,/throw new BadRequestException\('Bộ lọc không hợp lệ'\)/);
  }
  assert.match(book,/LIMIT 26 OFFSET \$3/);
  assert.match(book,/rows\.rows\.length>25/);
  assert.match(book,/b\.updated_at DESC,b\.id DESC/);
  assert.match(archive,/d\.updated_at DESC,d\.id DESC LIMIT 21 OFFSET \$4/);
});
