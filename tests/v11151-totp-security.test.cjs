const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const path=require('node:path');
const crypto=require('node:crypto');
const typescript=require('typescript');
// Compile the standalone cryptographic source under test; do not duplicate implementation.
const filename=path.resolve(__dirname,'../apps/api/src/modules/auth/totp.ts');
const js=typescript.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:typescript.ModuleKind.CommonJS,target:typescript.ScriptTarget.ES2022}}).outputText;
const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(js,filename);
const {base32Encode,base32Decode,totpCode,matchTotpStep,encryptTotpSecret,decryptTotpSecret,mfaEncryptionReady,randomTotpSecret}=mod.exports;
const keyBefore=process.env.ADMIN_MFA_ENCRYPTION_KEY;
process.env.ADMIN_MFA_ENCRYPTION_KEY=crypto.randomBytes(32).toString('base64');
const RFC_SECRET='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
test('RFC 6238 SHA-1 deterministic 6 digit values',()=>{
 assert.equal(totpCode(RFC_SECRET,1),'287082');
 assert.equal(totpCode(RFC_SECRET,37037036),'081804');
 assert.equal(totpCode(RFC_SECRET,37037037),'050471');
 assert.equal(totpCode(RFC_SECRET,41152263),'005924');
});
test('TOTP checks ±1 timestep and rejects malformed inputs',()=>{
 assert.equal(matchTotpStep(RFC_SECRET,'287082',60_000),1);
 assert.equal(matchTotpStep(RFC_SECRET,'287082',120_000),null);
 assert.equal(matchTotpStep(RFC_SECRET,'28O082',60_000),null);
 assert.equal(matchTotpStep(RFC_SECRET,287082,60_000),null);
 assert.equal(matchTotpStep(RFC_SECRET,'000000',60_000),null);
});
test('base32 160 bits round trips',()=>{
 const b=Buffer.from('12345678901234567890');
 assert.equal(base32Encode(b),RFC_SECRET);
 assert.deepEqual(base32Decode(base32Encode(b)),b);
 assert.equal(randomTotpSecret().length,32);
 assert.throws(()=>base32Decode('X'.repeat(31)));
});
test('AES-256-GCM MFA key is bound to account identity',()=>{
 const secret=randomTotpSecret(),account='7c2f984b-74b1-49a6-9c02-aa0c42921ef2';
 const encrypted=encryptTotpSecret(secret,account);
 assert.ok(mfaEncryptionReady());
 assert.ok(encrypted.startsWith('v1:'));
 assert.notEqual(encrypted,secret);
 assert.equal(decryptTotpSecret(encrypted,account),secret);
 assert.throws(()=>decryptTotpSecret(encrypted,'other-user'));
 assert.throws(()=>decryptTotpSecret(encrypted.slice(0,-2)+'AA',account));
});
test('encryption fails closed when operator secret missing/invalid',()=>{
 delete process.env.ADMIN_MFA_ENCRYPTION_KEY;
 assert.equal(mfaEncryptionReady(),false);
 assert.throws(()=>encryptTotpSecret(RFC_SECRET,'uid'));
 process.env.ADMIN_MFA_ENCRYPTION_KEY=keyBefore;
});
