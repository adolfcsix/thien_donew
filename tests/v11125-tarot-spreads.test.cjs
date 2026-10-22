'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const E=require('../packages/astrology-engine/src/tarot-rws.cjs'),A=require('../packages/astrology-engine/src/tarot-spreads.cjs'),D=require('../packages/interpretation/src/tarot-depth.cjs'),C=require('../packages/interpretation/src/tarot-comparison.cjs');
const reg=A.getSpreadRegistry(),clone=x=>JSON.parse(JSON.stringify(x));
const make=(spread='celtic-cross',extra={})=>A.newAdvancedSpread({spread,includeReversed:true,...extra},()=>new Uint8Array([0]));
const custom=(n=3)=>A.makeCustomLayout(Array.from({length:n},(_,i)=>({id:'p'+(i+1),label:'Vị trí '+(i+1),role:i===0?'focus':'action',prompt:'Điều cần đối chiếu '+(i+1),x:i%5,y:Math.floor(i/5),rotation:0})));
test('Waite reflective Celtic fixed order and independent coordinates: aim3/basis4/past5/next6, 10 cards without Significator',()=>{
 const s=make();a.equal(s.version,2);a.equal(s.draw.length,10);a.deepEqual(s.layout.positions.map(p=>p.role),['focus','challenge','aim','basis','past','next','self','environment','hopes','synthesis']);a.deepEqual(s.layout.positions.map(p=>[p.x,p.y]),[[1,2],[1,2],[1,0],[1,4],[0,2],[2,2],[4,6],[4,4],[4,2],[4,0]]);a.equal(s.layout.positions[1].rotation,90);a.equal(s.draw[1].reversed,false);
});
test('legacy one/three snapshots and standalone archive remain exact v1; no automatic migration',()=>{
 const s=E.newSpread({spread:'three',question:'cũ'},()=>new Uint8Array([0]));a.equal(s.version,1);a.deepEqual(E.parseReadingExport(JSON.stringify(E.createReadingExport(s))),s);a.equal(A.describeTarotMethod(s).legacy,true);a.equal(A.describeTarotMethod(s).knowledgeEdition,'11.120.0');a.deepEqual(E.reading(s).positions.map(p=>p.label),['Bối cảnh','Góc nhìn bổ sung','Hướng hành động']);
});
test('new snapshots pin supported method, knowledge checksum and base-catalog checksum',()=>{
 const s=make();a.deepEqual(s.method,reg.method);for(const [field,file] of [['knowledgeChecksum','tarot-depth-78.json'],['deckCatalogChecksum','tarot-rws-78.json']])a.equal(s.method[field],'sha256:'+crypto.createHash('sha256').update(fs.readFileSync(__dirname+'/../packages/knowledge/src/'+file)).digest('hex'));
 const bad=clone(s);bad.method.version=3;a.throws(()=>E.validateSpreadSnapshot(bad),/phiên bản|Phiên bản/);bad.method=clone(s.method);bad.method.knowledgeChecksum='sha256:bad';a.throws(()=>E.validateSpreadSnapshot(bad));
});
test('all four advanced layouts draw distinct cards and honor disabled reversals, including custom 16-card upper bound',()=>{
 for(const spread of ['one','three','celtic-cross','custom'])for(let i=0;i<20;i++){const s=A.newAdvancedSpread({spread,includeReversed:false,...(spread==='custom'?{layout:custom(16)}:{})});a.equal(new Set(s.draw.map(c=>c.id)).size,s.draw.length);a.ok(s.draw.every(c=>c.reversed===false));}
});
test('advanced validation checks before drawing: malformed layout consumes no entropy',()=>{
 let calls=0;const layout=custom();layout.positions[1].x=0;a.throws(()=>A.newAdvancedSpread({spread:'custom',layout},()=>{calls++;return new Uint8Array([0]);}));a.equal(calls,0);
});
test('fixed layout cannot be relabeled, reordered, rotated differently or repurposed under same version',()=>{
 const s=make();for(const mutate of [x=>x.layout.positions[2].role='basis',x=>x.layout.positions.reverse(),x=>x.layout.positions[0].label='new',x=>x.layout.positions[1].rotation=0,x=>x.layout.id='custom-v1']){const bad=clone(s);mutate(bad);a.throws(()=>E.validateSpreadSnapshot(bad));}
});
test('custom definitions survive exact JSON round trip including Unicode labels, roles, coordinates and context',()=>{
 const layout=custom(6);layout.positions[0].label='Nền tảng 🌿';layout.positions[0].prompt='Điều tôi cần biết nhưng chưa có bằng chứng';layout.positions[0].y=7;const s=make('custom',{layout,context:'relationship',question:'riêng tư'});a.deepEqual(E.parseReadingExport(JSON.stringify(E.createReadingExport(s))),s);a.equal(A.describeTarotMethod(s).context,'relationship');a.ok(Buffer.byteLength(JSON.stringify(E.createReadingExport(s)))<E.TAROT_ARCHIVE.maxBytes);
});
test('reject duplicate labels/cells/IDs, unknown roles, empty/too-long prompts and invalid custom ranges',()=>{
 for(const mutate of [x=>x.positions[1].label=x.positions[0].label,x=>x.positions[1].id=x.positions[0].id,x=>x.positions[0].role='__proto__',x=>x.positions[0].prompt='',x=>x.positions[0].prompt='a'.repeat(161),x=>x.positions[0].x=5,x=>x.positions[0].y=-1,x=>x.positions[0].rotation=90]){const l=custom();mutate(l);a.throws(()=>A.makeCustomLayout(l.positions));}
 a.throws(()=>A.makeCustomLayout([]));a.throws(()=>A.makeCustomLayout(Array.from({length:17},(_,i)=>({...custom(1).positions[0],id:'p'+i}))));
});
test('advanced raw oversize, wrong count, repeated/unknown cards, unknown context and illegal reversal fail closed',()=>{
 const s=make();for(const mutate of [x=>x.draw.pop(),x=>x.draw[1]=x.draw[0],x=>x.draw[0].id='unknown',x=>x.context='future',x=>x.extra='é'.repeat(13000),x=>{x.includeReversed=false;x.draw[0].reversed=true;}]){const bad=clone(s);mutate(bad);a.throws(()=>E.validateSpreadSnapshot(bad));}
});
test('untrusted computed results are discarded without changing method or user custom input',()=>{
 const s=make('custom',{layout:custom(4)});const raw={...s,result:{fortune:100},userId:'forged',method:{...s.method,confirmed:true},layout:{...s.layout,rawHtml:'<b>inject</b>'}};a.deepEqual(E.validateSpreadSnapshot(raw),s);
});
test('deep reading uses all 10 true roles and stored context, not hardcoded three-card roles',()=>{
 const s=make('celtic-cross',{context:'work'}),r=D.studyTarotSnapshot(s,{context:'relationship'});a.equal(r.positions.length,10);a.equal(r.combinations.length,45);a.equal(r.context,'work');a.match(r.positions[2].positionReading,/mong đạt/);a.match(r.positions[3].positionReading,/làm nền/);a.match(r.positions[9].positionReading,/không phải lời tiên đoán/);a.equal(r.savedMethod.version,2);a.equal(r.edition,'11.124.0');
});
test('custom 16-card deep report has 120 pairs and retains arbitrary slot purpose, with no snapshot mutation',()=>{
 const s=make('custom',{layout:custom(16)}),before=JSON.stringify(s),r=D.studyTarotSnapshot(s);a.equal(r.combinations.length,120);a.equal(r.positions.length,16);a.match(r.positions[12].positionReading,/Điều cần đối chiếu 13/);a.equal(JSON.stringify(s),before);
});
test('identical semantic layouts compare position-by-position and retain actual shared-card direction and positions',()=>{
 const x=make(),y=clone(x);y.draw[0].reversed=true;[y.draw[0],y.draw[1]]=[y.draw[1],y.draw[0]];const r=C.compareTarotSnapshots([x,y]);a.equal(r.positionsAligned,true);a.equal(r.rows.length,10);a.equal(r.shared.length,10);a.equal(r.shared.find(c=>c.id===x.draw[0].id).changedOrientation,true);a.deepEqual(r.shared.find(c=>c.id===x.draw[0].id).occurrences.map(x=>x.position),[0,1]);
});
test('different layout/version/role definitions never align ordinal slots; only actual card overlap is compared',()=>{
 const x=make(),y=make('three');a.equal(C.compareTarotSnapshots([x,y]).positionsAligned,false);a.deepEqual(C.compareTarotSnapshots([x,y]).rows,[]);
 const old=E.newSpread({spread:'three'},()=>new Uint8Array([0]));a.equal(C.compareTarotSnapshots([old,y]).positionsAligned,false);
 const c=make('custom',{layout:custom()}),d=clone(c);d.layout.positions[1].role='support';a.equal(C.compareTarotSnapshots([c,d]).positionsAligned,false);
});
test('context may differ while positional definition stays aligned; comparison does not copy main questions or predict probability',()=>{
 const x=make('three',{question:'PRIVATE-COMPARE',context:'work'}),y=make('three',{context:'relationship'}),r=C.compareTarotSnapshots([x,y]);a.equal(r.positionsAligned,true);a.deepEqual(r.contexts,['work','relationship']);a.ok(!JSON.stringify(r).includes('PRIVATE-COMPARE'));a.match(r.limit,/không phải xác suất/);a.throws(()=>C.compareTarotSnapshots([x]));a.throws(()=>C.compareTarotSnapshots([x,x,x,x,x]));
});
test('portable archive max-sized valid Unicode layout remains within parser limit',()=>{
 const layout=custom(16);for(const [i,p] of layout.positions.entries()){p.label=i+'🌿'.repeat(25);p.prompt='ệ'.repeat(120);}const s=make('custom',{layout,question:'ệ'.repeat(240)}),raw=JSON.stringify(E.createReadingExport(s));a.ok(Buffer.byteLength(raw)<=E.TAROT_ARCHIVE.maxBytes);a.deepEqual(E.parseReadingExport(raw),s);
});
