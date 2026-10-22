#!/usr/bin/env node
/**
 * THIÊN ĐỒ maintainability inventory. Read-only, no package installs or DB calls.
 * Flags areas for review without deleting independently versioned legacy files.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const codeRoots = ['apps/web/src', 'apps/api/src', 'packages'];
const suffixes = new Set(['.ts','.tsx','.css','.js','.cjs','.mjs']);
const skipDirs = new Set(['node_modules','dist','.next','coverage','.git']);
const walk = (location, files=[]) => {
  if(!existsSync(location))return files;
  for (const entry of readdirSync(location,{withFileTypes:true})) {
    const path=join(location,entry.name);
    if (entry.isDirectory() && !skipDirs.has(entry.name)) walk(path,files);
    else if (entry.isFile()) files.push(path);
  }
  return files;
};
const source=codeRoots.flatMap(p=>walk(join(root,p))).filter(p=>suffixes.has(extname(p)));
const metrics=source.map(p=>{
  const lines=readFileSync(p,'utf8').split(/\r?\n/);
  return {path:relative(root,p),lines:lines.length,longLines:lines.filter(x=>x.length>180).length,bytes:statSync(p).size};
}).sort((a,b)=>b.lines-a.lines);
const previewFiles=walk(join(root,'previews'));
const previewImages=previewFiles.filter(p=>/\.(png|jpe?g|webp)$/i.test(p));
const previewBytes=previewImages.reduce((n,p)=>n+statSync(p).size,0);
const oversized=metrics.filter(p=>p.lines>250 || p.longLines>20);
const output={project:'THIEN DO',sourceFiles:metrics.length,filesToReview:oversized.length,
  heaviestFiles:metrics.slice(0,12),reviewCandidates:oversized,
  historicalPreviewImages:{count:previewImages.length,bytes:previewBytes},
  notes:['Screenshots are not runtime assets; full archive retains them, developer ZIP omits them.',
    'tests/compat reuses identical runtime UMD modules; unique historical rules remain with executable browser/Node parity checks.',
    'CSS cascade across 20+ stylesheets needs real-app screenshot regression before consolidation.']};
if(process.argv.includes('--json')) process.stdout.write(JSON.stringify(output,null,2)+'\n');
else {
  console.log(`THIEN DO maintainability: ${metrics.length} source files; ${oversized.length} review candidates.`);
  console.log(`Historical preview images: ${previewImages.length}, ${(previewBytes/1048576).toFixed(2)} MiB.`);
  console.table(metrics.slice(0,10).map(({path,lines,longLines})=>({path,lines,longLines})));
  console.log('Read-only report. No code or engine was modified.');
}
