/** Offline CJS regression helpers. No npm install, network or database access. */
import {existsSync,mkdirSync,readFileSync,readdirSync,symlinkSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';

/** NODE_PATH is used only for this child test process, not saved in the project. */
export function createWorkspaceOverlay(projectRoot,temporaryDirectory){
  const root=resolve(projectRoot);
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  if(!Array.isArray(pkg.workspaces)||pkg.workspaces.length===0)throw Error('Missing workspaces');
  const names=new Set();
  for(const item of pkg.workspaces){
    if(typeof item!=='string'||!item||item.includes('..')||item.includes('*')||item.startsWith('/')||item.includes('\\'))throw Error('Invalid workspace path');
    const abs=resolve(root,item);
    if(!abs.startsWith(root+sep))throw Error('Workspace escaped project');
    const file=join(abs,'package.json');
    if(!existsSync(file))throw Error('Workspace missing package.json: '+item);
    const workspace=JSON.parse(readFileSync(file,'utf8'));
    if(typeof workspace.name!=='string'||!/^@[a-z0-9-]+\/[a-z0-9-]+$/.test(workspace.name))throw Error('Invalid workspace package name');
    if(names.has(workspace.name))throw Error('Duplicate workspace package name');
    names.add(workspace.name);
    const [scope,name]=workspace.name.split('/');
    const dir=join(temporaryDirectory,scope);mkdirSync(dir,{recursive:true});
    symlinkSync(abs,join(dir,name),process.platform==='win32'?'junction':'dir');
  }
  return [...names].sort();
}

/** CJS source and legacy-compatibility suites; never silently omit the latter. */
export function listOfflineTestFiles(projectRoot){
  const root=resolve(projectRoot);
  const directories=['tests','tests/compat/tests'];
  const files=[];
  for(const directory of directories){
    const abs=join(root,directory);
    if(!existsSync(abs))throw Error('Missing required test directory: '+directory);
    const current=readdirSync(abs).filter(file=>file.endsWith('.test.cjs')).sort();
    if(current.length===0)throw Error('Empty required test suite: '+directory);
    files.push(...current.map(file=>directory+'/'+file));
  }
  return files;
}

/** Reject implicit external injection via ambient module and preload paths. */
export function testEnvironment(baseEnv,temporaryDirectory){
  const {NODE_PATH: _ignoredPath, NODE_OPTIONS: _ignoredPreloads, ...rest}=baseEnv;
  return {...rest,NODE_PATH:resolve(temporaryDirectory)};
}

/** A missing TAP summary is never treated as success. */
export function summarizeNodeTap(source,exitCode){
  const text=String(source);
  const field=name=>{const m=text.match(new RegExp(`^# ${name} (\\d+)\\s*$`,'gm'));return m?Number(m[m.length-1].match(/\d+/)[0]):null;};
  const tests=field('tests'),passed=field('pass'),failed=field('fail');
  const modules={};
  for(const match of text.matchAll(/Cannot find (?:module|package) '([^'\r\n]+)'/g))modules[match[1]]=(modules[match[1]]||0)+1;
  const missingOccurrences=Object.values(modules).reduce((sum,n)=>sum+n,0);
  const valid=Number.isSafeInteger(tests)&&Number.isSafeInteger(passed)&&Number.isSafeInteger(failed)&&passed+failed===tests;
  const resultStatus=exitCode===0&&valid&&failed===0?'PASS':valid?'BLOCKED':'INCOMPLETE';
  return {status:resultStatus,tests,passed,failed,modules,missingOccurrences,
    unclassifiedFailures:valid?Math.max(0,failed-missingOccurrences):null,
    note:'Node-only offline evidence. A BLOCKED/PASS result does NOT verify npm ci, typecheck, build or PostgreSQL E2E.'};
}
