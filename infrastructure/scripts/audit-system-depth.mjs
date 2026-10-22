/** Current source inventory; deliberate research boundaries are not bugs. */
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const json=rel=>JSON.parse(readFileSync(resolve(root,rel),'utf8'));
const source=rel=>readFileSync(resolve(root,rel),'utf8');
const routes=[];
function walk(dir){for(const d of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,d.name);if(d.isDirectory())walk(p);else if(d.name==='page.tsx'){const rel=relative(resolve(root,'apps/web/src/app'),dirname(p));routes.push({route:rel?'/'+rel.replaceAll('\\','/'):'/',file:relative(root,p).replaceAll('\\','/'),dynamic:rel.includes('[')});}}}
walk(resolve(root,'apps/web/src/app'));
const registry=json('packages/knowledge/src/capability-registry.json'),lessons=json('apps/web/src/features/academy/lessons.json'),glossary=json('apps/web/src/features/academy/glossary.json');
const issues=[];
for(const m of registry.modules){
 if(m.status==='source-implemented'&&!routes.some(r=>r.route===m.route))issues.push(`${m.id}: missing public page`);
 for(const path of m.evidencePaths)if(!existsSync(resolve(root,path))||!statSync(resolve(root,path)).isFile())issues.push(`${m.id}: missing evidence ${path}`);
}
for(const [file,marker] of [['apps/web/src/app/mai-hoa/page.tsx','WorkbookPanel report={workbook}'],['apps/web/src/features/ky-mon/question-reading-panel.tsx','WorkbookPanel report={workbook}'],['apps/web/src/app/luc-hao/page.tsx','LucHaoQuestionWorkbook chart={naJia}']])if(!source(file).includes(marker))issues.push(`${file}: workbook not connected`);
if(new Set(lessons.map(l=>l.slug)).size!==lessons.length)issues.push('duplicate academy slug');
for(const l of lessons)if(!routes.some(r=>r.route===l.route))issues.push(`${l.slug}: missing calculator CTA`);
const report={release:json('package.json').version,scope:'source inventory and depth integration; not full runtime or expert review',routeCount:routes.length,routes:routes.sort((a,b)=>a.route.localeCompare(b.route)),capabilities:{total:registry.modules.length,implemented:registry.modules.filter(m=>m.status==='source-implemented').length,partial:registry.modules.filter(m=>m.status==='internal-partial').length,missing:registry.modules.filter(m=>m.status==='not-implemented').length},academy:{lessons:lessons.length,sections:lessons.reduce((n,l)=>n+l.sections.length,0),questions:lessons.reduce((n,l)=>n+l.quiz.length,0),glossary:glossary.length,practicalNewSlugs:lessons.filter(l=>/^(mai-hoa|ky-mon|luc-hao)-/.test(l.slug)).map(l=>l.slug)},remaining:registry.modules.map(m=>({id:m.id,status:m.status,limitation:m.nextGap})),issues,verdict:issues.length?'FAIL':'PASS'};
console.log(JSON.stringify(report,null,2));if(issues.length)process.exitCode=1;
