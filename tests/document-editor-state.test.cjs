const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),ts=require('./helpers-typeloader.cjs');
const m={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../apps/web/src/features/van-kho/document-editor-state.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports});
const {documentFingerprint}=m.exports;
const form={slug:'draft',title:'Draft',body:'Body',excerpt:'',subject:'nhap-mon',tags:'one,two',authorId:''};
test('every persisted editable document field marks the form dirty',()=>{for(const key of Object.keys(form))assert.notEqual(documentFingerprint(form),documentFingerprint({...form,[key]:'changed'}),key);});
test('server identity/revision and object key order do not invent draft changes',()=>{const reordered=Object.fromEntries(Object.entries(form).reverse());assert.equal(documentFingerprint(form),documentFingerprint({...reordered,id:'id',revision:3}));});
test('restoring edited content to the saved values clears the fingerprint difference',()=>{const edited={...form,body:'Another body'};assert.notEqual(documentFingerprint(form),documentFingerprint(edited));edited.body=form.body;assert.equal(documentFingerprint(form),documentFingerprint(edited));});
