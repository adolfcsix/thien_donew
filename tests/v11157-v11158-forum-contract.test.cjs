const {test}=require('node:test');const assert=require('node:assert/strict');
const f=require('../apps/api/src/modules/forum/forum-contract.cjs');
const validId='55555555-5555-4555-8555-555555555555';
function candidate(overrides={}){return {title:'Bàn về Tử Vi',body:'Làm sao đối chiếu cùng một cung khi có hai nguồn trường phái khác nhau?',category:'tu-vi',...overrides};}
test('accepts known categories/visibility and plain user text',()=>{const t=f.thread(candidate());assert.equal(t.visibility,'public');assert.equal(t.chartShared,false);});
test('denies XSS payload, executable scheme, control characters',()=>{for(const body of ['<script>alert(1)</script>'.repeat(4),'javascript:alert(1)'.repeat(4),'Nội dung \u0000 độc hại'.repeat(4)])assert.throws(()=>f.thread(candidate({body})));});
test('rejects untrusted external attachments and fake chart consent before DB checks',()=>{assert.throws(()=>f.thread(candidate({imageUrl:'https://untrusted.example/picture.png'})));assert.throws(()=>f.thread(candidate({chartId:validId})));assert.throws(()=>f.thread(candidate({chartId:'../../etc/passwd',shareChart:true})));assert.equal(f.thread(candidate({chartId:validId,shareChart:true,chartAlias:'Lá số tham khảo'})).chartShared,true);});
test('chart preview leaks no DOB/hour, name or ruleSet',()=>{const x=f.chartPreview({chart_shared:true,chart_alias:'Bài toán nghiên cứu',birth_date:'2000-01-01',gender:'Nam',ruleSet:'private',hour:11});assert.deepEqual(Object.keys(x).sort(),['alias','detailsHidden','type']);});
test('comment and reply parent validation',()=>{assert.equal(f.comment({body:'Ý này cần dẫn chứng',parentId:validId}).parentId,validId);assert.throws(()=>f.comment({body:'<' }));});
test('report reasons are allowlisted',()=>{assert.equal(f.report({reason:'privacy'}).reason,'privacy');assert.throws(()=>f.report({reason:'arbitrary'}));});
test('moderator actions require reasons and allowlist',()=>{assert.equal(f.moderate({action:'hide',reason:'Tiết lộ thông tin cá nhân'}).action,'hide');assert.throws(()=>f.moderate({action:'ban_all',reason:'test action'}));});
test('private visibility never appears for unrelated readers',()=>{const row={state:'visible',visibility:'private',author_id:validId};assert.equal(f.visible(row,'66666666-6666-4666-8666-666666666666'),false);assert.equal(f.visible(row,validId),true);assert.equal(f.visible({...row,visibility:'members'},null),false);assert.equal(f.visible({...row,visibility:'public'},null),true);assert.equal(f.visible({...row,state:'hidden'},validId),false);});
test('search metacharacters escaped',()=>{assert.equal(f.search('50%_\\'),String.raw`50\%\_\\`);});
test('offset bounds and required texts enforced',()=>{assert.throws(()=>f.page(-1));assert.throws(()=>f.page('1e40'));assert.throws(()=>f.thread(candidate({title:'x'})));});

test('Forum pagination rejects repeated, array, object, empty and ambiguous offsets',()=>{
 assert.equal(f.page(undefined),0);
 assert.equal(f.page('0'),0);
 assert.equal(f.page('20'),20);
 for(const bad of [null,'',[],['10'],{},'1e2','-1','1.5','00',' 2 ','200001']) assert.throws(()=>f.page(bad));
});
