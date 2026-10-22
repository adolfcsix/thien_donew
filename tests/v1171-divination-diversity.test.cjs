'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const model=require('../apps/web/src/features/iching/hexagrams.cjs');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

test('V11.71: Bát quái đủ tám tượng hào khác nhau, đọc từ dưới lên',()=>{
 assert.equal(model.TRIGRAMS.length,8);
 assert.equal(new Set(model.TRIGRAMS.map(t=>t.id)).size,8);
 assert.equal(new Set(model.TRIGRAMS.map(t=>t.bits)).size,8);
 for(const t of model.TRIGRAMS)assert.match(t.bits,/^[01]{3}$/);
 assert.equal(model.TRIGRAMS.find(t=>t.id==='qian').bits,'111');
 assert.equal(model.TRIGRAMS.find(t=>t.id==='kun').bits,'000');
});

test('V11.71: đủ 64 quẻ, không lặp thứ tự Văn Vương hoặc cấu hình',()=>{
 assert.equal(model.HEXAGRAMS.length,64);
 assert.deepEqual(model.HEXAGRAMS.map(h=>h.number),Array.from({length:64},(_,i)=>i+1));
 assert.equal(new Set(model.HEXAGRAMS.map(h=>h.bits)).size,64);
 assert.equal(new Set(model.HEXAGRAMS.map(h=>h.name)).size,64);
 assert.equal(model.KING_WEN_GRID.length,8);
 assert.equal(new Set(model.KING_WEN_GRID.flat()).size,64);
 for(const h of model.HEXAGRAMS){
  assert.equal(h.bits,h.lower.bits+h.upper.bits);
  assert.ok(h.theme&&h.inquiry);
  assert.equal(model.hexagramFromBits(h.bits).number,h.number);
 }
});

test('V11.71: mẫu quẻ chuẩn và bất đối xứng thượng/hạ quái',()=>{
 const cases={1:['Thuần Càn','111111'],2:['Thuần Khôn','000000'],3:['Thủy Lôi Truân','100010'],11:['Địa Thiên Thái','111000'],12:['Thiên Địa Bĩ','000111'],29:['Thuần Khảm','010010'],30:['Thuần Ly','101101'],63:['Thủy Hỏa Ký Tế','101010'],64:['Hỏa Thủy Vị Tế','010101']};
 for(const [num,[name,bits]] of Object.entries(cases)){
  assert.equal(model.hexagramByNumber(Number(num)).name,name);
  assert.equal(model.hexagramFromBits(bits).number,Number(num));
 }
});

test('V11.71: tính quẻ biến chỉ lật hào 6 và 9',()=>{
 const staticReading=model.hexagramFromLines([7,7,7,7,7,7]);
 assert.equal(staticReading.original.number,1);assert.equal(staticReading.transformed.number,1);
 assert.deepEqual(staticReading.changing,[]);
 const dynamic=model.hexagramFromLines([9,7,8,6,7,8]);
 assert.deepEqual(dynamic.changing,[1,4]);
 assert.equal(dynamic.original.bits,'110010');
 assert.equal(dynamic.transformed.bits,'010110');
 assert.equal(dynamic.original.number,model.hexagramFromBits('110010').number);
 assert.equal(dynamic.transformed.number,model.hexagramFromBits('010110').number);
 assert.deepEqual(dynamic.lines,[9,7,8,6,7,8]);
 for(const h of model.HEXAGRAMS){
  const lines=h.bits.split('').map(b=>b==='1'?7:8);
  assert.equal(model.hexagramFromLines(lines).original.number,h.number);
 }
});

test('V11.71: ba đồng xu mô phỏng đúng tổng 2/3 và thứ tự sáu hào',()=>{
 assert.deepEqual(model.castThreeCoins(()=>0),[6,6,6,6,6,6]);
 assert.deepEqual(model.castThreeCoins(()=>1),[9,9,9,9,9,9]);
 const dice=[0,0,1,0,1,1,1,1,1,0,0,0,0,1,1,1,0,0];let i=0;
 assert.deepEqual(model.castThreeCoins(()=>dice[i++]),[7,8,9,6,8,7]);
 assert.equal(i,18);
});

test('V11.71: dữ liệu nhập sai bị chặn, không tự tính tiếp',()=>{
 for(const lines of [[7,8,9],[7,8,9,6,7,5],[7,8,9,6,7,'8'],new Array(7).fill(7),null]){
  assert.throws(()=>model.hexagramFromLines(lines),TypeError);
 }
 assert.throws(()=>model.hexagramFromBits('010'),TypeError);
 assert.equal(model.hexagramByNumber(0),null);assert.equal(model.hexagramByNumber(65),null);
});

test('V11.71: tra cứu và điều hướng mở công cụ thực, vẫn có ranh giới nghiên cứu',()=>{
 const domains=json('packages/knowledge/src/research-disciplines.json').records;
 const iching=domains.find(d=>d.id==='kinh-dich');
 assert.equal(iching.route,'/iching');
 assert.match(iching.boundary,/không triển khai|chưa triển khai/i);
 for(const id of ['thai-at','luc-nham']){const d=domains.find(d=>d.id===id);assert.equal(d.route,'/'+(id==='thai-at'?'thai-at':'dai-luc-nham'));assert.ok(d.boundary);assert.equal(require('../packages/knowledge/src/capability-registry.cjs').getCapability(id).status,'internal-partial');}
 for(const id of ['ky-mon','mai-hoa','luc-hao','phong-thuy'])assert.ok(domains.find(d=>d.id===id).route);
 const navigation=read('apps/web/src/lib/navigation.ts');
 assert.match(navigation,/href: '\/iching'/);assert.match(navigation,/href: '\/huyen-hoc'/);
 const hub=read('apps/web/src/app/huyen-hoc/page.tsx');
 assert.match(hub,/disciplines\.records/);
 assert.match(hub,/item\.route/);
 const page=read('apps/web/src/app/iching/page.tsx');
 assert.match(page,/hexagramFromLines/);assert.match(page,/castThreeCoins/);
 assert.match(page,/changing/);
});

test('V11.71: từ điển mở rộng có nhóm Kinh Dịch và link công cụ',()=>{
 const items=json('apps/web/src/features/academy/glossary.json');
 const terms=items.filter(x=>x.group==='Kinh Dịch');
 assert.ok(terms.length>=12);
 assert.equal(new Set(terms.map(x=>x.term)).size,terms.length);
 assert.ok(terms.every(x=>x.route==='/iching'&&x.meaning&&x.caution));
});

test('V11.71: Ngũ hành có hai chu trình 5 phần tử, đầy đủ quan hệ 25 cặp',()=>{
 const m=require('../apps/web/src/features/wuxing/elements.cjs');
 assert.equal(m.ELEMENTS.length,5);
 assert.equal(new Set(m.ELEMENTS.map(e=>e.id)).size,5);
 let generated=0,generatedBy=0,controlled=0,controlledBy=0,same=0;
 for(const a of m.ELEMENTS){
  assert.ok(m.elementById(a.id));assert.ok(m.SHENG[a.id]);assert.ok(m.KE[a.id]);
  for(const b of m.ELEMENTS){
   const r=m.compareElements(a.id,b.id);assert.ok(r.label&&r.summary);
   if(r.kind==='generate')generated++;
   else if(r.kind==='generated-by')generatedBy++;
   else if(r.kind==='control')controlled++;
   else if(r.kind==='controlled-by')controlledBy++;
   else if(r.kind==='same')same++;
   else assert.fail('unknown relationship');
   assert.equal(m.compareElements(b.id,a.id).kind, {generate:'generated-by','generated-by':'generate',control:'controlled-by','controlled-by':'control',same:'same'}[r.kind]);
  }
 }
 assert.deepEqual([generated,generatedBy,controlled,controlledBy,same],[5,5,5,5,5]);
 assert.equal(m.compareElements('wood','fire').label,'Mộc sinh Hỏa');
 assert.equal(m.compareElements('wood','earth').label,'Mộc khắc Thổ');
 assert.throws(()=>m.compareElements('unknown','fire'),TypeError);
});

test('V11.71: đường dẫn Ngũ hành được nối từ menu, trang chủ và thư phòng',()=>{
 assert.match(read('apps/web/src/lib/navigation.ts'),/href: '\/ngu-hanh'/);
 assert.match(read('apps/web/src/app/page.tsx'),/<ToolDirectory\s*\/>/);
 assert.match(read('apps/web/src/lib/discipline-presentation.ts'),/path: '\/ngu-hanh'/);
 assert.match(read('apps/web/src/app/huyen-hoc/page.tsx'),/'\/ngu-hanh':/);
 assert.match(read('apps/web/src/app/huyen-hoc/page.tsx'),/navigationItems\.filter/);
 const page=read('apps/web/src/app/ngu-hanh/page.tsx');
 assert.match(page,/compareElements/);
 assert.match(page,/aria-live="polite"/);
});
