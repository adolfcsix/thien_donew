'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {spawnSync}=require('node:child_process');
const ts=require('./helpers-typeloader.cjs');
const root=resolve(__dirname,'..');
const source=readFileSync(resolve(root,'apps/web/src/components/account-settings.tsx'),'utf8');

function savedNameHandler(args){
  const ast=ts.createSourceFile('account-settings.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let declaration;
  const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text==='saveName') declaration=node; ts.forEachChild(node,visit);};
  visit(ast);
  assert.ok(declaration,'profile save handler is present');
  const compiled=ts.transpileModule(declaration.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  return new Function('name','user','accountApi','perform','setName','lastSavedName',`${compiled}\nreturn saveName;`)(...args);
}

test('A68: successful profile save makes form, dirty baseline and provider patch match canonical server name',async()=>{
  let sent,patch,pending,displayName='  Hà    Nội  ',lastSavedName={current:'Tên cũ'};
  const user={displayName:'Tên cũ'};
  const save=savedNameHandler([displayName,user,{updateProfile: async input=>{sent=input;return {updated:true,displayName:'Hà Nội'};}},
    (action,message,onCommit)=>{pending=(async()=>{patch=onCommit(await action());})();},
    next=>{displayName=next;},lastSavedName]);
  let prevented=false;save({preventDefault(){prevented=true;}});await pending;
  assert.equal(prevented,true);
  assert.equal(sent,'Hà    Nội');
  assert.deepEqual(patch,{displayName:'Hà Nội'});
  assert.equal(displayName,'Hà Nội');
  assert.equal(lastSavedName.current,'Hà Nội');
  assert.equal(displayName.trim(),patch.displayName,'form is no longer dirty after confirmed normalization');
});

test('A68: unchanged display name cannot trigger an unnecessary request',()=>{
  let requested=false;
  const save=savedNameHandler(['Đã lưu',{displayName:'Đã lưu'}, {updateProfile:()=>{requested=true;}},()=>{requested=true;},()=>{}, {current:'Đã lưu'}]);
  save({preventDefault(){}});assert.equal(requested,false);
});

test('A68: Owner bootstrap validates unsafe URL before loading pg, prompting or touching DB',()=>{
  for(const suffix of ['?host=remote.example.invalid','#fragment']){
    const result=spawnSync(process.execPath,['infrastructure/scripts/create-local-owner.mjs','--email','owner@example.invalid'],{
      cwd:root,encoding:'utf8',timeout:5000,
      env:{...process.env,NODE_ENV:'test',CI:'false',DATABASE_URL:'postgres://operator:hidden@127.0.0.1/disposable'+suffix}
    });
    assert.equal(result.status,1,result.stderr);
    assert.match(result.stderr,/Tu choi tham so/);
    assert.doesNotMatch(result.stdout+result.stderr,/operator:hidden|Go TAO OWNER|remote\.example\.invalid/);
  }
});

test('A68: absent pg reports actionable offline install issue with no secret and no consent prompt',()=>{
  // Run only when pg is absent. In a correctly provisioned workspace this
  // diagnostic belongs to the real DB integration suite instead.
  try{require.resolve('pg',{paths:[root]});return;}catch{}
  const result=spawnSync(process.execPath,['infrastructure/scripts/create-local-owner.mjs','--email','owner@example.invalid'],{
    cwd:root,encoding:'utf8',timeout:5000,
    env:{...process.env,NODE_ENV:'test',CI:'false',DATABASE_URL:'postgres://operator:hidden@127.0.0.1/disposable'}
  });
  assert.equal(result.status,1,result.stderr);
  assert.match(result.stderr,/Thieu thu vien PostgreSQL pg/);
  assert.doesNotMatch(result.stdout+result.stderr,/operator:hidden|Go TAO OWNER/);
});

function loginCompletion({me,loginDestination,router,generation,setUser}) {
  const file=readFileSync(resolve(root,'apps/web/src/components/auth-provider.tsx'),'utf8');
  const ast=ts.createSourceFile('auth-provider.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let expression;
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='completeLogin'){
      assert.ok(ts.isCallExpression(node.initializer));
      expression=node.initializer.arguments[0].getText(ast);
    }
    ts.forEachChild(node,visit);
  };
  visit(ast);assert.ok(expression);
  const compiled=ts.transpileModule(`const completion = ${expression};`,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const setLoading=()=>{},setAvatarRevision=()=>{};
  const sessionChannel={current:null};
  const lastSessionCheck={current:0};
  const pathname='/login';
  const accountApi={me};
  const window={location:{search:''}};
  return new Function('generation','accountApi','setUser','setLoading','setAvatarRevision','sessionChannel','loginDestination','pathname','window','router','lastSessionCheck',`${compiled}\nreturn completion;`)(
    generation,accountApi,setUser,setLoading,setAvatarRevision,sessionChannel,loginDestination,pathname,window,router,lastSessionCheck
  );
}

test('A68: confirmed POST navigates after role check even if profile GET never resolves',async()=>{
  let settle;const routes=[],generation={current:0};
  const changes=[];
  const complete=loginCompletion({
    me:()=>new Promise(resolve=>{settle=resolve;}),
    loginDestination:async()=>'/chart',router:{replace:path=>routes.push(path)},generation,
    setUser:next=>changes.push(typeof next==='function'?next(changes.at(-1)??null):next)
  });
  await complete({user:{id:'member-a',email:'a@local.test'}});
  assert.deepEqual(routes,['/chart'],'navigation must not await pending /me');
  assert.equal(changes[0].id,'member-a');
  generation.current++;// Another login/logout happened before delayed GET returned.
  settle({user:{id:'member-old',email:'old@local.test'}});
  await Promise.resolve();
  assert.equal(changes.length,1,'stale refresh must not restore a retired session');
});

test('A68: role verification failure routes to unprivileged chart and profile outage does not undo POST',async()=>{
  const routes=[],generation={current:0},changes=[];
  const complete=loginCompletion({
    me:async()=>{throw new Error('temporarily offline');},
    loginDestination:async()=>{throw new Error('role backend offline');},
    router:{replace:path=>routes.push(path)},generation,
    setUser:next=>changes.push(typeof next==='function'?next(changes.at(-1)??null):next)
  });
  await complete({user:{id:'member-a',email:'a@local.test'}});
  await Promise.resolve();
  assert.deepEqual(routes,['/chart']);
  assert.equal(changes.at(-1).id,'member-a');
});
