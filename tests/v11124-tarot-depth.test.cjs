'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const E=require('../packages/astrology-engine/src/tarot-rws.cjs'),D=require('../packages/interpretation/src/tarot-depth.cjs'),data=require('../packages/knowledge/src/tarot-depth-78.json');
const snap=(ids=['major-00','major-01','swords-13'],rev=[false,true,false])=>({version:1,deck:E.METHODS.deck,spread:ids.length===1?'one':'three',includeReversed:true,question:'PRIVATE-TOPIC',draw:ids.map((id,i)=>({id,reversed:rev[i]??false}))});
test('78 identities exactly match existing RWS; 156 symbols, 234 contexts, 156 scenarios and 78 distinct identity-bound comparisons',()=>{
 a.deepEqual(data.cards.map(c=>c.id),E.CARDS.map(c=>c.id));a.equal(data.cards.flatMap(c=>c.symbols).length,156);a.equal(data.cards.flatMap(c=>c.contexts).length,234);a.equal(data.cards.flatMap(c=>c.scenarios).length,156);a.equal(data.cards.flatMap(c=>c.companions).length,78);
 for(const c of data.cards){a.equal(c.reversed.alternatives.length,2);a.notEqual(c.reversed.alternatives[0],c.reversed.alternatives[1]);a.ok(c.companions.every(x=>E.CARDS.some(b=>b.id===x.id)&&x.id!==c.id));a.ok(c.upright.meaning.length>85);}
 a.equal(new Set(data.cards.map(c=>c.contexts[0].prompt)).size,78);a.equal(new Set(data.cards.map(c=>c.scenarios[0].situation)).size,78);
});
test('element profile preserves Golden Dawn provenance: Wands Fire/Swords Air; planetary majors are not forcibly assigned',()=>{
 a.equal(D.getTarotCardDepth('wands-01').depth.element.value,'Lửa');a.equal(D.getTarotCardDepth('swords-01').depth.element.value,'Khí');a.equal(D.getTarotCardDepth('major-01').depth.element.value,null);a.equal(D.getTarotCardDepth('major-01').depth.element.attribution,'Mercury');a.equal(D.getTarotCardDepth('major-08').depth.element.value,'Lửa');a.equal(D.getTarotCardDepth('major-11').number,11);
});
test('numerical lens differentiates Zero, pip Ten and court King with no false pip 14 or personal number',()=>{
 a.equal(D.getTarotCardDepth('major-00').depth.number.value,0);a.equal(D.getTarotCardDepth('pentacles-10').depth.number.value,10);const king=D.getTarotCardDepth('pentacles-14').depth.number;a.equal(king.value,null);a.equal(king.kind,'court-role');a.equal(king.label,'King');
});
test('known symbols trace to distinct actual card image: Moon towers vs Sun child; Four Wands has recovery reversal alternative',()=>{
 a.ok(D.getTarotCardDepth('major-18').depth.symbols.some(s=>s.image.includes('tháp')));a.ok(D.getTarotCardDepth('major-19').depth.symbols.some(s=>s.image.includes('Trẻ')));a.match(D.getTarotCardDepth('wands-04').depth.reversed.alternatives[1],/ổn định vẫn còn/);
});
test('read-only deterministic report preserves archive and secure draw identities/orientations; no random redraw or private question export',()=>{
 const s=snap(),before=JSON.stringify(s),r=D.studyTarotSnapshot(s);a.equal(JSON.stringify(s),before);a.deepEqual(r,D.studyTarotSnapshot(s));a.deepEqual(r.positions.map(p=>[p.id,p.orientation]),[['major-00','upright'],['major-01','reversed'],['swords-13','upright']]);a.doesNotMatch(JSON.stringify(r),/PRIVATE-TOPIC/);a.deepEqual(E.parseReadingExport(JSON.stringify(E.createReadingExport(s))),s);
});
test('one-card has zero combinations; three-card has exactly three unordered index pairs with correct orientation',()=>{
 a.equal(D.studyTarotSnapshot(snap(['cups-02'])).combinations.length,0);const r=D.studyTarotSnapshot(snap());a.deepEqual(r.combinations.map(c=>c.indexes),[[0,1],[0,2],[1,2]]);a.deepEqual(r.combinations[0].orientations,['upright','reversed']);a.equal(r.combinations[0].kind,'curated-pair');a.ok(r.combinations.every(c=>c.limit.includes('không phải')));
});
test('context changes prompts only, retaining every drawn position; curated pair honors relationship/resources contexts',()=>{
 const s=snap(),x=D.studyTarotSnapshot(s,{context:'relationship'}),y=D.studyTarotSnapshot(s,{context:'resources'});a.deepEqual(x.positions.map(p=>p.id),y.positions.map(p=>p.id));a.notEqual(x.combinations[0].contextQuestion,y.combinations[0].contextQuestion);a.ok(x.positions.every(p=>p.context.id==='relationship'));a.equal(x.positions[1].alternatives.length,2);
});
test('orientation toggle changes interpretation while retaining pair membership and position labels',()=>{
 const s=snap(),r=D.studyTarotSnapshot(s);s.draw[0].reversed=true;const next=D.studyTarotSnapshot(s);a.notEqual(next.positions[0].interpretation,r.positions[0].interpretation);a.deepEqual(next.combinations.map(c=>c.ids),r.combinations.map(c=>c.ids));a.deepEqual(next.positions.map(p=>p.label),['Bối cảnh','Góc nhìn bổ sung','Hướng hành động']);
});
test('same-suit and cross-theme pairs are bounded observations, never automatic elemental conflict',()=>{
 const same=D.studyTarotSnapshot(snap(['wands-01','wands-02','wands-03']));a.ok(same.combinations.every(c=>c.kind==='same-suit'));const cross=D.studyTarotSnapshot(snap(['major-04','cups-05','swords-10']));a.ok(cross.combinations.every(c=>c.kind==='cross-theme'));a.match(cross.combinations[0].discussion,/chưa tự xác nhận xung khắc/);
});
test('every one of 78 cards works in both orientations with complete evidence and safe input rejection',()=>{
 for(const c of E.CARDS)for(const reversed of [false,true]){const r=D.studyTarotSnapshot(snap([c.id],[reversed]));a.equal(r.positions.length,1);a.equal(r.positions[0].symbols.length,2);a.equal(r.combinations.length,0);}
 a.throws(()=>D.getTarotCardDepth('missing'));a.throws(()=>D.studyTarotSnapshot(snap(),{context:'prediction'}));a.throws(()=>D.studyTarotSnapshot(snap(['major-00','major-00','cups-01'])));a.throws(()=>D.studyTarotSnapshot({...snap(),version:2}));
});
test('caller cannot mutate canonical card depth, methods or shared sources via returned report',()=>{
 const r=D.getTarotCardDepth('major-00');r.depth.symbols[0].image='tamper';a.notEqual(D.getTarotCardDepth('major-00').depth.symbols[0].image,'tamper');const s=D.studyTarotSnapshot(snap());s.method.imagery='tamper';a.notEqual(D.studyTarotSnapshot(snap()).method.imagery,'tamper');
});
test('search exposes original names and deep motifs, with no dependence on subjective free-text question',()=>{
 a.match(D.tarotDepthSearchText('major-02'),/Cuộn sách/);a.match(D.tarotDepthSearchText('major-18'),/Đường giữa hai tháp/);a.match(D.tarotDepthSearchText('swords-13'),/Queen of Swords/);
});
