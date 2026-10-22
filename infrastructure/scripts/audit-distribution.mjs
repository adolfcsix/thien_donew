/** Clean-source distribution guard: no runtime changes or generated output. */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {resolve, join, relative, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const missing=[];
const forbidden=['reports','api-ci.log','web-ci.log','docs/SOURCE_MANIFEST.sha256','docs/BRAND_CHANGELOG.json','docs/CHART_CHANGELOG.json','docs/COMMUNITY_CHANGELOG.json','docs/WESTERN_WORLDS_CHANGELOG.json','docs/CHANGELOG.json','docs/cleanup'];
for(const rel of forbidden)if(existsSync(join(root,rel)))missing.push(`Generated/obsolete distribution entry: ${rel}`);
for(const rel of ['.env.example','.env.e2e.example'])if(!existsSync(join(root,rel)))missing.push(`Missing setup template: ${rel}`);
const folders=['apps/web/src','apps/api/src','packages','tests','infrastructure'];
const rootGuides=readdirSync(root).filter(name=>/^(?:BAT_DAU|HUONG_DAN_|ADMIN_TROUBLESHOOTING|CONTRIBUTING).*\.md$/.test(name));
for(const name of rootGuides)missing.push('Obsolete guide entry: '+name);
const currentDocs=new Set(['BAO_CAO_HIEN_TAI.md','TAROT_78_ANH_BAI_GOC_1909.md','TAROT_DECKS_MODERN_LICENSES.md','BRAND_ART_PROMPTS.json','WESTERN_WORLD_ART.json']);
for(const entry of readdirSync(join(root,'docs'),{withFileTypes:true}))if(entry.isFile()&&!currentDocs.has(entry.name))missing.push('Obsolete top-level document: docs/'+entry.name);
for(const name of ['README.md','HUONG_DAN.md','docs/BAO_CAO_HIEN_TAI.md','infrastructure/release/current.json'])if(!existsSync(join(root,name)))missing.push('Missing current entry point: '+name);
for(const name of readdirSync(join(root,'tests')))if(/^a3[3-7].*\.browser\.cjs$/.test(name)||name==='chart-experience.browser.cjs')missing.push('Superseded browser suite: '+name);
if(existsSync(join(root,'previews')))for(const name of readdirSync(join(root,'previews')))if(name.endsWith('.html'))missing.push('Generated preview must stay outside source bundle: '+name);

const sha=new Map();let files=0;let bytes=0;
function walk(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){
 const absolute=join(folder,entry.name);if(entry.isDirectory()){if(['node_modules','.next','dist','reports'].includes(entry.name))continue;walk(absolute);continue;}
 if(!entry.isFile())continue;
 const rel=relative(root,absolute).replaceAll('\\','/');
 // Only executable module source: research/data/fixtures can intentionally share byte-identical records.
 if(!/\.(?:ts|tsx|js|cjs|mjs|css)$/.test(entry.name))continue;
 const content=readFileSync(absolute);files++;bytes+=content.length;
 const hash=createHash('sha256').update(content).digest('hex');
 const prior=sha.get(hash);if(prior)missing.push(`Identical executable source files: ${prior} and ${rel}`);else sha.set(hash,rel);
 }}
for(const f of folders)walk(join(root,f));
const world=join(root,'apps/web/public/theme/western');
for(const name of ['astrology','numerology','research','symbols','tarot'])for(const mode of ['light','dark'])if(!existsSync(join(world,`${name}-${mode}.webp`)))missing.push(`Missing Western background: ${name}-${mode}`);
if(!existsSync(join(root,'apps/web/src/components/thien-mon-mark.tsx')))missing.push('Missing Thiên Môn mark');
console.log(`Distribution: ${files} maintained source modules, ${bytes} maintained source bytes; checked five Western light/dark art pairs`);
if(missing.length){for(const issue of missing)console.error('FAIL '+issue);process.exitCode=1;}
else console.log('PASS: no obsolete bundle artifacts or byte-identical executable sources (including tests/compat). This does not establish semantic deduplication.');
