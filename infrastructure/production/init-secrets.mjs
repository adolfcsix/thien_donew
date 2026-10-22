/** One-time local generation. Never rotates existing credentials or prints values. */
import {mkdirSync,writeFileSync,chmodSync} from 'node:fs';
import {isAbsolute,join} from 'node:path';
import {randomBytes} from 'node:crypto';
const dir=process.argv[2];
if(!dir||!isAbsolute(dir))throw Error('Provide an absolute NEW secrets directory; its parent must already exist');
mkdirSync(dir,{mode:0o700});
chmodSync(dir,0o700);
for(const name of ['db_owner_password','db_app_password','admin_mfa_encryption_key','auth_otp_secret']){
 const value=randomBytes(32).toString(name==='admin_mfa_encryption_key'?'base64':'hex');
 writeFileSync(join(dir,name),value+'\n',{mode:0o444,flag:'wx'});
}
console.log('Created four private secrets. Keep the MFA key and encrypted backups together; never regenerate keys for an existing deployment.');
