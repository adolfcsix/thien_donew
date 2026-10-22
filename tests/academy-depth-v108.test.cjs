'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const get=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const lessons=JSON.parse(get('apps/web/src/features/academy/lessons.json'));
const terms=JSON.parse(get('apps/web/src/features/academy/glossary.json'));
const slugs=lessons.map(l=>l.slug);

test('academy lessons are substantial, unique and safe for static slug routes',()=>{
 assert.ok(lessons.length>=16);
 assert.equal(new Set(slugs).size,slugs.length);
 for(const l of lessons){
   assert.match(l.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
   assert.ok(l.title.length>8 && l.lead.length>35, l.slug);
   assert.ok(l.sections.length>=4,l.slug);
   assert.ok(l.sections.every(s=>s.heading.length>8 && s.body.length>=180),l.slug);
   assert.ok(l.example.length>100 && l.pitfalls.length>=2,l.slug);
   assert.ok(l.minutes>0 && Number.isInteger(l.minutes),l.slug);
   assert.ok(l.quiz.length>=2,l.slug);
 }
});
test('all questions have one in-range correct answer and feedback',()=>{
 for(const lesson of lessons)for(const q of lesson.quiz){
  assert.ok(q.question.length>=20,lesson.slug);
  assert.ok(q.choices.length>=2 && new Set(q.choices).size===q.choices.length,lesson.slug);
  assert.ok(Number.isInteger(q.correct) && q.correct>=0 && q.correct<q.choices.length,lesson.slug);
  assert.ok(q.reason.length>=30,lesson.slug);
 }
});
test('all academy CTA targets exist in route map',()=>{
 const routes=new Set(['/',...['chart','calendar','bazi','good-days','library','star-atlas','collection','academy','mai-hoa','luc-hao','ky-mon'].map(s=>'/'+s)]);
 for(const l of lessons)assert.ok(routes.has(l.route),`${l.slug}: ${l.route}`);
});
test('glossary includes category, caution, reliable local routes for each term',()=>{
 assert.ok(terms.length>=25);
 const names=terms.map(x=>x.term);
 assert.equal(new Set(names).size,names.length);
 const categories=new Set(['Lịch pháp','Tử Vi','Bát Tự','Kinh Dịch','Nghiên cứu','Thần số học','Chiêm tinh']);
 for(const t of terms){
   assert.ok(categories.has(t.group),t.term);
   assert.ok(t.meaning.length>45 && t.caution.length>=25,t.term);
   assert.ok(t.route.startsWith('/')&&!t.route.startsWith('//')&&!t.route.includes('..'),t.term);
   if(t.route.startsWith('/academy/'))assert.ok(slugs.includes(t.route.slice('/academy/'.length)),t.term);
 }
});
test('new academy routes retain a clear separation between knowledge and interpretation',()=>{
 const academy=get('apps/web/src/app/academy/page.tsx');
 const detail=get('apps/web/src/app/academy/[slug]/page.tsx');
 const checker=get('apps/web/src/features/academy/lesson-check.tsx');
 assert.match(academy,/generate|lesson\.sections|lesson\.quiz|lesson\.slug/);
 assert.match(detail,/generateStaticParams/);
 assert.match(detail,/notFound\(\)/);
 assert.doesNotMatch(detail,/\{lesson\.reference\}/);
 assert.match(detail,/lesson\.sections/);
 assert.match(detail,/LessonCheck/);
 assert.match(checker,/aria-live="polite"/);
 assert.match(checker,/disabled=\{submitted\}/);
 assert.match(checker,/localStorage\.setItem/);
});
test('tam hop lesson matches numeric relationship underlying original engine',()=>{
 const l=lessons.find(x=>x.slug==='tam-phuong-tu-chinh');
 assert.ok(l.sections.some(s=>s.body.includes('cách nhau 4 và 8') && s.body.includes('cách 6')));
 assert.equal(l.quiz[0].choices[l.quiz[0].correct],'Ngọ');
 const engine=get('packages/astrology-engine/src/tuvi.js');
 assert.match(engine,/const BRANCHES = \['Tý', 'Sửu', 'Dần'/);
});
test('academy content reflects documented engine cautions',()=>{
 const engine=get('packages/astrology-engine/src/tuvi.js');
 assert.match(engine,/23:00–23:59/);
 assert.match(engine,/Canh\/Nhâm/);
 assert.ok(lessons.find(l=>l.slug==='can-chi-gio-sinh').sections.some(s=>s.body.includes('23:00–23:59')));
 assert.ok(lessons.find(l=>l.slug==='tu-hoa-va-bang-quy-tac').sections.some(s=>s.body.includes('Canh\/Nhâm')));
});
test('progress key is local only and no tracking or hidden external script added',()=>{
 const progress=get('apps/web/src/features/academy/academy-progress.tsx');
 const check=get('apps/web/src/features/academy/lesson-check.tsx');
 assert.match(progress,/thiendo\.academy\.completed\.v1:/);
 assert.doesNotMatch(progress+check,/fetch\(|XMLHttpRequest|sendBeacon|eval\(/);
});
test('library no longer advertises stale V8 implementation status',()=>{
 const source=get('apps/web/src/app/library/page.tsx');
 assert.doesNotMatch(source,/chưa được thực hiện đầy đủ trong V8/);
 assert.match(source,/normalizeSearchText/);
 assert.match(source,/role="status"/);
});
test('responsive and reduced motion considerations exist',()=>{
 const css=get('apps/web/src/app/academy/academy.css')+get('apps/web/src/app/library/library.css');
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
