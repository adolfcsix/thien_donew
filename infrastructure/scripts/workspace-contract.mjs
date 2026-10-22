/**
 * Offline workspace dependency contract. No registry access and no mutation.
 * Ensures local file: links resolve to the named in-repo workspace, checks
 * entry points and rejects dependency cycles. npm ci remains authoritative.
 */
import {readFileSync, existsSync, realpathSync} from 'node:fs';
import {resolve, dirname, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const parse = file => JSON.parse(readFileSync(file,'utf8'));
const nested = path => path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
export function auditWorkspaceGraph(root = ROOT) {
  const errors=[];
  const rootPkg=parse(resolve(root,'package.json'));
  const paths=rootPkg.workspaces||[];
  if(!Array.isArray(paths)||paths.length===0) return {status:'FAIL',errors:['Missing workspaces'],workspaces:0,internalEdges:0};
  const workspaceMap=new Map(), pathMap=new Map(), graph=new Map(), names=new Set();
  for(const dir of paths){
    if(typeof dir!=='string'||!dir||!nested(dir)||isAbsolute(dir)||dir.startsWith('/')){errors.push(`Invalid workspace path: ${dir}`);continue;}
    const dirPath=resolve(root,dir), key=relative(root,dirPath);
    if(!nested(key)||!existsSync(resolve(dirPath,'package.json'))){errors.push(`Missing workspace manifest: ${dir}`);continue;}
    // Resolve symlinks so a workspace cannot point outside the repository.
    if(!nested(relative(realpathSync(root), realpathSync(dirPath)))){errors.push(`Workspace escapes root: ${dir}`);continue;}
    const pkg=parse(resolve(dirPath,'package.json'));
    if(!pkg.name||names.has(pkg.name))errors.push(`Missing/duplicate workspace name: ${dir}`);
    names.add(pkg.name);
    if(pkg.private!==true) errors.push(`Workspace must remain private: ${dir}`);
    for(const field of ['main','types']){
      if(pkg[field]){
        const entry=resolve(dirPath,pkg[field]);
        if(!nested(relative(dirPath,entry))||!existsSync(entry) ||
          !nested(relative(realpathSync(dirPath), realpathSync(entry))))
          errors.push(`Missing or unsafe ${field} entry: ${dir}/${pkg[field]}`);
      }
    }
    if(pathMap.has(key))errors.push(`Duplicate workspace path: ${dir}`);
    workspaceMap.set(pkg.name,{dir:dirPath,manifest:pkg});pathMap.set(key,pkg.name);graph.set(pkg.name,[]);
  }
  let internalEdges=0;
  const all=[['.',root,rootPkg],...[...workspaceMap.values()].map(({dir,manifest})=>[manifest.name,dir,manifest])];
  for(const [owner,base,pkg] of all){
    for(const field of ['dependencies','devDependencies','optionalDependencies','peerDependencies']){
      for(const [name,range] of Object.entries(pkg[field]||{})){
        if(typeof range!=='string'||!range.trim()){errors.push(`Invalid dependency range: ${owner} / ${name}`);continue;}
        if(range.startsWith('file:')){
          const dest=resolve(base,range.slice(5));
          const target=relative(root,dest);
          if(!nested(target)||!pathMap.has(target) ||
             !existsSync(dest) || !nested(relative(realpathSync(root),realpathSync(dest)))){
            errors.push(`Local dependency outside declared workspaces: ${owner} / ${name} (${range})`);continue;
          }
          const actual=pathMap.get(target);
          if(name!==actual) errors.push(`Local dependency name mismatch: ${owner} / ${name} points to ${actual}`);
          else {internalEdges++; if(graph.has(owner)) graph.get(owner).push(actual);}
        } else if(name.startsWith('@thiendo/')||range.startsWith('workspace:')){
          errors.push(`Internal package must use a declared file: workspace link: ${owner} / ${name}`);
        }
      }
    }
  }
  const visiting=new Set(),visited=new Set();
  function dfs(name,chain){
    if(visiting.has(name)){errors.push(`Workspace dependency cycle: ${[...chain,name].join(' -> ')}`);return;}
    if(visited.has(name))return;
    visiting.add(name);
    for(const target of graph.get(name)||[])dfs(target,[...chain,name]);
    visiting.delete(name);visited.add(name);
  }
  for(const name of graph.keys())dfs(name,[]);
  return {status:errors.length?'FAIL':'PASS',workspaces:workspaceMap.size,internalEdges,errors};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=auditWorkspaceGraph();
  console.log(`Workspace contract: ${result.status}; ${result.workspaces} workspaces, ${result.internalEdges} validated local edges`);
  for(const error of result.errors)console.error('FAIL '+error);
  if(result.errors.length)process.exitCode=1;
}
