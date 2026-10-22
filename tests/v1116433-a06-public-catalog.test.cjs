'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('./helpers-typeloader.cjs');
const root=path.join(__dirname,'..');
function source(p){return fs.readFileSync(path.join(root,p),'utf8');}
const compiled=ts.transpileModule(source('apps/web/src/lib/public-catalog-validation.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{},module:{exports:{}}};
vm.runInNewContext(compiled,context);
const {isPublicBook,isPublicDocument,isPublicThread,parsePublicCatalogPage}=context.exports;
const book={id:'123',slug:'the-fool',title:'Tarot',author:'Editor',subject:'tarot',accessLevel:'free',synopsis:'Nội dung',featured:false,hasCover:true,format:null};
const doc={id:'456',slug:'ket-cau',title:'Bài viết',excerpt:'Tóm tắt',subject:'tarot',tags:['a'],author:null,publishedAt:null,updatedAt:'2026-10-17T00:00:00Z'};
const thread={id:'789',title:'Chủ đề',body:'Tóm tắt',category:'tarot',authorId:'u',author:'Tác giả',visibility:'public',pinned:false,locked:false,commentsCount:2,updatedAt:'2026-10-17T00:00:00Z'};
test('A06 public book contract accepts real API fields but rejects missing strings and invalid types',()=>{
 assert.equal(isPublicBook(book),true);
 assert.equal(isPublicBook({...book,synopsis:undefined}),false);
 assert.equal(isPublicBook({...book,accessLevel:'root'}),false);
 assert.equal(isPublicBook({...book,hasCover:'yes'}),false);
 assert.equal(isPublicBook(null),false);
});
test('A06 public Van Kho contract rejects non-text tags and malformed dates/author fields',()=>{
 assert.equal(isPublicDocument(doc),true);
 assert.equal(isPublicDocument({...doc,tags:['a',42]}),false);
 assert.equal(isPublicDocument({...doc,publishedAt:{}}),false);
 assert.equal(isPublicDocument({...doc,excerpt:null}),false);
});
test('A06 forum contract rejects invalid comment counts and missing render fields',()=>{
 assert.equal(isPublicThread(thread),true);
 assert.equal(isPublicThread({...thread,commentsCount:NaN}),false);
 assert.equal(isPublicThread({...thread,commentsCount:-1}),false);
 assert.equal(isPublicThread({...thread,body:null}),false);
});
test('A06 paged hook checks every item before committing it to React rendering',()=>{
 const hook=source('apps/web/src/lib/use-paged-catalog.ts');
 assert.match(hook,/parsePublicCatalogPage<T>\(page,listKey,offset,validateItem\)/);
 for(const [file,validator] of [
  ['apps/web/src/app/books/page.tsx','isPublicBook'],
  ['apps/web/src/app/van-kho/page.tsx','isPublicDocument'],
  ['apps/web/src/app/forum/page.tsx','isPublicThread'],
 ]) assert.ok(source(file).includes(`validateItem:${validator}`),file);
});
test('A06 failed cover loads render stable placeholder rather than a broken image icon',()=>{
 const page=source('apps/web/src/app/books/page.tsx');
 assert.match(page,/onError=\{\(\)=>setFailed\(true\)\}/);
 assert.match(page,/book\.hasCover&&!failed/);
 assert.match(page,/aria-label="Chưa có bìa sách"/);
});

test('A06 parsed pages fail closed on invalid record, missing/malformed cursor and looping empty pages',()=>{
 const good={books:[book],nextOffset:25};
 assert.equal(parsePublicCatalogPage(good,'books',0,isPublicBook).items.length,1);
 assert.equal(parsePublicCatalogPage({books:[],nextOffset:null},'books',25,isPublicBook).nextOffset,null);
 for(const page of [
  {books:[{...book,synopsis:undefined}],nextOffset:null},
  {books:{},nextOffset:null},
  {books:[book]},
  {books:[book],nextOffset:'25'},
  {books:[book],nextOffset:0},
  {books:[],nextOffset:25},
 ]) assert.throws(()=>parsePublicCatalogPage(page,'books',0,isPublicBook),/không hợp lệ/);
});
