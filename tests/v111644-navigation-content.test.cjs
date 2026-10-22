'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('./helpers-typeloader.cjs'),root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'apps/web/src/lib/navigation.ts'),'utf8');
const result={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:result,exports:result.exports});
const nav=result.exports;
test('Van Kho is discoverable by search and belongs to one visible menu branch',()=>{
 assert.ok(nav.searchNavigation('van kho').some(x=>x.href==='/van-kho'));
 assert.equal(nav.navigationGroups.flatMap(g=>g.items).filter(x=>x.href==='/van-kho').length,1);
 assert.equal(nav.findNavigationGroup('/van-kho/research-document').id,'hoc-tap');
});
test('member destinations have meaningful page titles',()=>{
 for(const [route,title] of Object.entries({'/van-kho':'Văn Khố','/forum':'Thiên Đồ Luận Đàn','/membership':'Thành viên & Pro','/consultation':'Tư vấn riêng','/articles':'Thiên Đồ Tạp Chí','/pro/research':'Báo cáo nghiên cứu'}))assert.equal(nav.navigationPageTitle(route),title);
});
test('support destinations appear once in the rendered sidebar model',()=>{
 const shell=fs.readFileSync(path.join(root,'apps/web/src/components/shell.tsx'),'utf8').split('</aside>')[0];
 for(const route of ['/huong-dan','/ho-tro']){
  const count=nav.navigationGroups.flatMap(g=>g.items).filter(x=>x.href===route).length+(shell.match(new RegExp('href="'+route+'"','g'))||[]).length;
  assert.equal(count,1,route);
 }
});
