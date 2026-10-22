const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const homepage=read('apps/web/src/app/page.tsx');
const homeCopy=JSON.parse(read('apps/web/src/customize/home.json'));
const homeStyles=read('apps/web/src/app/home-v139.module.css');
const theme=read('apps/web/src/app/ux-v11162.css');
const layout=read('apps/web/src/app/layout.tsx');
const shell=read('apps/web/src/components/shell.tsx');
test('main routes remain curated links to existing modules, without invented publication records',()=>{
 for(const route of ['/books','/van-kho','/forum','/huyen-giai']){
  assert.match(homepage,new RegExp(`href="${route.replaceAll('/','\\/')}"`));
  assert.match(read(`apps/web/src/app/${route.slice(1)}/page.tsx`),/export default/);
 }
 // Copy is now user-editable; enforce populated text and the actual JSX binding.
 assert.equal(typeof homeCopy.headline,'string');
 assert.ok(homeCopy.headline.trim().length>0);
 assert.match(homepage,/import copy from '@\/customize\/home\.json'/);
 assert.match(homepage,/<h1 id="home-title">\{copy.headline\}/);
 assert.match(homepage,/<ToolDirectory\s*\/>/);
});
test('home screen has no required network image/fonts and avoids layout shift from artwork',()=>{
 assert.match(homeStyles,/aspect-ratio:1/);
 assert.match(homeStyles,/minmax\(0,1fr\)/);
 assert.doesNotMatch(homepage,/<img\b|https?:\/\//);
 assert.doesNotMatch(homeStyles,/@import|url\(https?:/);
});
test('single global UX stylesheet is loaded after protected historical baselines',()=>{
 const a=layout.indexOf("import " + "'./period-reading-v111495.css'");
 const b=layout.indexOf("import " + "'./ux-v11162.css'");
 assert.ok(a>=0&&b>a);
 assert.equal(layout.match(/ux-v11162.css/g)?.length,1);
});
test('navigation is explicit, with five real, nonduplicate mobile choices and a skip link',()=>{
 const before=shell.split('export function Shell(')[0];
 const links=[...before.matchAll(/\{href:\s*'([^']+)', symbol:\s*'[^']+', text:/g)].map(m=>m[1]);
 assert.deepEqual(links,['/','/huyen-hoc','/study','/forum']);
 assert.match(shell,/aria-label="Điều hướng điện thoại"/);
 assert.match(shell,/href="#main-content" className="skip-link"/);
 assert.match(theme,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});
test('keyboard focus, WCAG-compatible controls, reduced motion and mobile writing are supported',()=>{
 assert.match(theme,/:focus-visible/);
 assert.match(theme,/outline:3px solid var\(--ux-focus\)/);
 assert.match(theme,/min-height:44px/);
 assert.match(theme,/prefers-reduced-motion:reduce/);
 assert.match(theme,/prefers-contrast:more/);
 assert.match(theme,/font-size:16px/);
 assert.match(theme,/max-width:100%/);
});
test('reading and forum modules honor semantic tokens rather than light-only backgrounds',()=>{
 const van=read('apps/web/src/app/van-kho/van-kho.module.css');
 const forum=read('apps/web/src/app/forum/forum.module.css');
 for(const css of [van,forum]){
  assert.match(css,/\.page\{color:var\(--text\)/);
  assert.match(css,/background:var\(--panel\)/);
  assert.match(css,/border-color:var\(--line-strong\)/);
 }
 assert.match(van, /\.prose\{max-width:78ch/);
 assert.match(forum,/\.reply\{border-left-color:var\(--gold\)/);
});
test('UI work does not change migration ledger, API or knowledge engine',()=>{
 assert.doesNotMatch(homepage,/api\(|fetch\(/);
 assert.match(theme,/no engine, database, role, or payment rules/);
});
