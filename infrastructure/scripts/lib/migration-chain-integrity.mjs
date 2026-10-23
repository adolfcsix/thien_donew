/**
 * V11.160.1 stability: validate immutable SQL migration history BEFORE touching
 * PostgreSQL.  The 001–018 digest baseline is a reviewed frozen artifact.
 * Later migrations remain protected by the database schema_migrations ledger.
 */
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';

export function verifyMigrationChain(directory,baselinePath,extensionPath=defaultExtensionPath,recentPath=defaultRecentPath,currentPath=defaultCurrentPath){
 const allSql=readdirSync(directory).filter(f=>f.endsWith('.sql'));
 const invalid=allSql.filter(f=>!/^\d{3}_[a-z0-9_-]+\.sql$/.test(f));
 if(invalid.length)throw new Error('Invalid SQL migration filename(s): '+invalid.join(', '));
 const files=allSql.sort();
 if(!files.length)throw new Error('No SQL migrations found; refusing to connect to PostgreSQL');
 for(let i=0;i<files.length;i++){
  const expected=String(i+1).padStart(3,'0');
  const actual=files[i].slice(0,3);
  if(actual!==expected)throw new Error(`SQL migration chain incomplete or duplicate at #${expected}: ${files[i]}`);
 }
 let baseline;
 try{baseline=JSON.parse(readFileSync(baselinePath,'utf8'));}
 catch(error){throw new Error(`Missing or invalid frozen migration baseline: ${error.message}`);}
 if(!baseline?.migrations||typeof baseline.migrations!=='object'||Array.isArray(baseline.migrations))throw new Error('Frozen migration baseline has invalid schema');
 const frozen=Object.entries(baseline.migrations);
 if(frozen.length!==18)throw new Error('Unexpected frozen migration count; fail closed');
 for(let i=0;i<frozen.length;i++){
  const [filename,digest]=frozen[i];
  if(files[i]!==filename||!/^([0-9a-f]{64})$/.test(String(digest)))throw new Error('Missing or altered frozen SQL migration entry: '+filename);
  const actual=createHash('sha256').update(readFileSync(join(directory,filename))).digest('hex');
  if(actual!==digest)throw new Error('Immutable SQL migration was modified: '+filename);
 }
 let extension;
 try{extension=JSON.parse(readFileSync(extensionPath,'utf8'));}
 catch(error){throw new Error(`Missing or invalid 019–027 baseline: ${error.message}`);}
 const later=Object.entries(extension?.migrations||{});
 if(later.length!==9)throw new Error('Unexpected 019–027 baseline length');
 for(let j=0;j<later.length;j++){
  const [filename,digest]=later[j];
  if(files[j+18]!==filename||!/^([0-9a-f]{64})$/.test(String(digest)))throw new Error('Missing or altered frozen later SQL migration entry: '+filename);
  if(createHash('sha256').update(readFileSync(join(directory,filename))).digest('hex')!==digest)
   throw new Error('Immutable SQL migration was modified: '+filename);
 }
 let recent;
 try{recent=JSON.parse(readFileSync(recentPath,'utf8'));}
 catch(error){throw new Error(`Missing or invalid 028–029 baseline: ${error.message}`);}
 const modern=Object.entries(recent?.migrations||{});
 if(modern.length!==2)throw new Error('Unexpected 028–029 baseline length');
 for(let i=0;i<modern.length;i++){
  const [name,digest]=modern[i];
  if(files[i+27]!==name||!/^([0-9a-f]{64})$/.test(String(digest)))throw new Error('Missing or altered 028–029 SQL entry: '+name);
  if(createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')!==digest)throw new Error('Immutable SQL migration was modified: '+name);
 }
 let current;
 try{current=JSON.parse(readFileSync(currentPath,'utf8'));}
 catch(error){throw new Error(`Missing or invalid 030 baseline: ${error.message}`);}
 const newest=Object.entries(current?.migrations||{});
 if(newest.length!==1)throw new Error('Unexpected 030 baseline length');
 for(const [name,digest] of newest){
  if(files[29]!==name||!/^([0-9a-f]{64})$/.test(String(digest)))throw new Error('Missing or altered 030 SQL entry: '+name);
  if(createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')!==digest)throw new Error('Immutable SQL migration was modified: '+name);
 }
 // Freeze the additive 031 single-image migration independently; the 001–030 digests stay immutable.
 let community;
 try{community=JSON.parse(readFileSync(defaultCommunityPath,'utf8'));}
 catch(error){throw new Error(`Missing or invalid 031 baseline: ${error.message}`);}
 const forum=Object.entries(community?.migrations||{});
 if(forum.length!==1)throw new Error('Unexpected 031 baseline length');
 for(const [name,digest] of forum){
  if(files[30]!==name||!/^([0-9a-f]{64})$/.test(String(digest)))throw new Error('Missing or altered frozen 031 entry: '+name);
  if(createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')!==digest)throw new Error('Immutable SQL migration was modified: '+name);
 }
 const administration=JSON.parse(readFileSync(defaultAdminConsolePath,'utf8'));
 const administrationEntries=Object.entries(administration.migrations||{});
 if(administrationEntries.length!==1)throw new Error('Unexpected 032 baseline length');
 for(const [name,digest] of administrationEntries){
  if(files[31]!==name||!/^([0-9a-f]{64})$/.test(String(digest)))throw new Error('Missing or altered frozen 032 entry: '+name);
  if(createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')!==digest)throw new Error('Immutable SQL migration was modified: '+name);
 }
 const hub=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../db/baselines/migration-033.json'),'utf8'));
 const hubEntries=Object.entries(hub.migrations||{});if(hubEntries.length!==1)throw new Error('Unexpected 033 baseline length');
 for(const [name,digest] of hubEntries){if(files[32]!==name||createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')!==digest)throw new Error('Immutable 033 migration was modified: '+name);}
 const showcase=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../db/baselines/migration-034.json'),'utf8'));
 const showcaseEntries=Object.entries(showcase.migrations||{});if(showcaseEntries.length!==1)throw new Error('Unexpected 034 baseline length');
 for(const [name,digest] of showcaseEntries){if(files[33]!==name||createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')!==digest)throw new Error('Immutable 034 migration was modified: '+name);}
 // A62: freeze the additive browser-trust SQL after review; retain every earlier digest unchanged.
 const trusted=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../db/baselines/migration-035.json'),'utf8'));
 const trustedEntries=Object.entries(trusted.migrations||{});if(trustedEntries.length!==1)throw new Error('Unexpected 035 baseline length');
 for(const [name,digest] of trustedEntries){if(files[34]!==name||createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')!==digest)throw new Error('Immutable 035 migration was modified: '+name);}
 const specialties=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../db/baselines/migration-036.json'),'utf8'));
 const specialtyEntries=Object.entries(specialties.migrations||{});
 if(specialtyEntries.length!==1)throw new Error('Unexpected 036 baseline length');
 for(const [name,digest] of specialtyEntries){
  if(files[35]!==name||createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')!==digest)
   throw new Error('Immutable 036 migration was modified: '+name);
 }
 const lifetime=JSON.parse(readFileSync(resolve(import.meta.dirname,'../../db/baselines/migration-037.json'),'utf8'));
 const lifetimeEntries=Object.entries(lifetime.migrations||{});
 if(lifetimeEntries.length!==1)throw new Error('Unexpected 037 baseline length');
 for(const [name,digest] of lifetimeEntries){if(files[36]!==name||createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')!==digest)throw new Error('Immutable 037 migration was modified: '+name);}
 return {total:files.length,frozen:lifetimeEntries.length+specialtyEntries.length+trustedEntries.length+showcaseEntries.length+hubEntries.length+administrationEntries.length+frozen.length+later.length+modern.length+newest.length+forum.length,files};
}

export const defaultDbDir=resolve(import.meta.dirname,'../../db');
export const defaultBaselinePath=resolve(import.meta.dirname,'../../../infrastructure/db/baselines/migrations-001-018.json');

export const defaultExtensionPath=resolve(import.meta.dirname,'../../../infrastructure/db/baselines/migrations-019-027.json');

export const defaultRecentPath=resolve(import.meta.dirname,'../../../infrastructure/db/baselines/migrations-028-029.json');

export const defaultCurrentPath=resolve(import.meta.dirname,'../../../infrastructure/db/baselines/migration-030.json');

export const defaultCommunityPath=resolve(import.meta.dirname,'../../../infrastructure/db/baselines/migration-031.json');

export const defaultAdminConsolePath=resolve(import.meta.dirname,'../../../infrastructure/db/baselines/migration-032.json');
