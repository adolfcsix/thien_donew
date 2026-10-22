'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../apps/web/src'),app=path.join(root,'app');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root),pages=files.filter(p=>p.endsWith('/page.tsx'));
function routePattern(file){return '/'+path.relative(app,path.dirname(file)).split(path.sep).filter(Boolean).map(p=>p.startsWith('[')&&p.endsWith(']')?'[^/]+':p).join('/');}
function valid(href){const target=(href.split(/[?#]/)[0].replace(/\/$/,'')||'/');return pages.some(p=>new RegExp('^'+routePattern(p)+'$').test(target));}
test('A06 all authored static internal page links lead to a real Next.js page, including dynamic slug/id pages',()=>{
 assert.ok(pages.length>=70);
 const missing=[];let count=0;
 for(const file of files.filter(p=>p.endsWith('.tsx'))){
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/href\s*=\s*["'](\/[^"']+)["']/g)){
   count++;if(!valid(match[1]))missing.push(path.relative(root,file)+': '+match[1]);
  }
 }
 assert.ok(count>100,'expected meaningful link coverage');
 assert.deepEqual(missing,[]);
});
