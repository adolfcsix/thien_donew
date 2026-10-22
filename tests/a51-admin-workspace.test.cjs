'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('./helpers-typeloader.cjs'),m={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../apps/web/src/features/admin-console/model.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,URLSearchParams});
const {resolveAdminLink:resolve,adminLinks}=m.exports;
test('financial query panels have their own active link, title and capability',()=>{
 for(const panel of ['plans','orders','consultations']){const link=resolve('/admin','ignored=1&panel='+panel);assert.equal(link.href,'/admin?panel='+panel);assert.equal(link.cap,'finance.read');}
});
test('query panels do not replace another real admin route; unknown panels fall back safely',()=>{
 assert.equal(resolve('/admin/finance','panel=plans').href,'/admin/finance');assert.equal(resolve('/admin','panel=unknown').href,'/admin');assert.equal(resolve('/admin','').href,'/admin');assert.equal(resolve('/admin-imposter',''),undefined);
});
test('authority and inbox remain administrative routes; owner team scope remains explicit',()=>{
 assert.equal(resolve('/admin/authority','').label,'Quyền & chức năng');assert.equal(resolve('/admin/team','').cap,'owner');assert.equal(resolve('/admin/messages','').label,'Hộp thư quản trị');assert.equal(new Set(adminLinks.map(l=>l.href)).size,adminLinks.length);
});
