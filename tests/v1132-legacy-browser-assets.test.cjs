'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {browserEnginePath}=require('./compat/packages/engine/assets.cjs');
const engine=require('./compat/packages/engine/tuvi.js');
test('compat browser executes canonical modules with legacy rules preserved',()=>{
 const context=vm.createContext({});for(const name of ['lunar','auxiliary','tuhoa','cycles','year-stars','tuvi','verify']){const file=browserEnginePath(name);assert.ok(fs.existsSync(file));vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});}
 for(const date of ['1900-01-31','1990-08-15','2004-01-01','2023-03-22','2100-07-19'])for(const hour of [0,9,15,23]){const input={date,hour,gender:'Nam'},expected=engine.calculate(input),actual=context.ThienDoTuVi.calculate(input);assert.equal(JSON.stringify(actual),JSON.stringify(expected));assert.ok(context.ThienDoVerifier.check(actual).passed);}
});
test('identical compatibility modules share runtime exports and reject unknown asset paths',()=>{
 for(const name of ['auxiliary','cycles','tuhoa','year-stars']){assert.equal(require('./compat/packages/engine/'+name+'.js'),require('../packages/astrology-engine/src/'+name+'.js'));assert.equal(browserEnginePath(name),path.resolve(__dirname,'../packages/astrology-engine/src/'+name+'.js'));}
 for(const name of ['../tuvi','constructor','toString','unknown','lunar.js'])assert.equal(browserEnginePath(name),null);
});
