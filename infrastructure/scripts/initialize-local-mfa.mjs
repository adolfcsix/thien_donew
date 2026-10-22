/** Local operator setup only. Never replaces any existing encryption key. */
import {readFile,writeFile,rename,unlink,open} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {parseEnv} from 'node:util';
import {createInterface} from 'node:readline/promises';
import pg from 'pg';
import {initialMfaEnv,isValidMfaKey} from './lib/initial-mfa-env.mjs';
const envPath=resolve('.env'),lockPath=envPath+'.mfa-init.lock';let lock,db;
try{
 if(process.env.NODE_ENV==='production'||process.env.CI==='true')throw Error('Chỉ chạy trên máy local, không chạy production/CI.');
 const env=await readFile(envPath,'utf8'),config=parseEnv(env),url=new URL(config.DATABASE_URL||'');
 if(config.NODE_ENV==='production'||config.CI==='true')throw Error('Tệp .env là cấu hình production/CI; không khởi tạo local.');
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('DATABASE_URL phải trỏ database local của bạn.');
 lock=await open(lockPath,'wx',0o600);db=new pg.Client({connectionString:config.DATABASE_URL,connectionTimeoutMillis:5000});await db.connect();
 const existing=config.ADMIN_MFA_ENCRYPTION_KEY;let next=env;
 if(existing){if(!isValidMfaKey(existing))throw Error('Khóa MFA hiện tại không đúng định dạng. Khôi phục khóa gốc, không tự thay khóa.');console.log('Đã có khóa MFA hợp lệ trong .env; giữ nguyên.');}
 else{
  const credentials=await db.query('SELECT count(*)::int AS n FROM admin_mfa_credentials');
  if(credentials.rows[0].n>0)throw Error('Database đã có liên kết MFA. Cần khôi phục ADMIN_MFA_ENCRYPTION_KEY gốc từ .env sao lưu; script không ghi đè.');
  next=initialMfaEnv(next,randomBytes(32).toString('base64'));
 }
 if([...env.matchAll(/^[\t ]*(?:export[\t ]+)?AUTH_OTP_SECRET[\t ]*=/gm)].length>1)throw Error('.env có nhiều dòng AUTH_OTP_SECRET; kiểm tra cấu hình trước.');
 if(!config.AUTH_OTP_SECRET)next=next.replace(/^[\t ]*(?:export[\t ]+)?AUTH_OTP_SECRET[\t ]*=[^\r\n]*/m,'AUTH_OTP_SECRET='+randomBytes(32).toString('hex'));
 if(!Object.hasOwn(parseEnv(next),'AUTH_OTP_SECRET'))next+='\nAUTH_OTP_SECRET='+randomBytes(32).toString('hex')+'\n';
 if(next!==env){const temp=envPath+'.'+randomUUID()+'.tmp';await writeFile(temp,next,{mode:0o600,flag:'wx'});await rename(temp,envPath);console.log('Đã khởi tạo khóa cục bộ trong .env. Sao lưu tệp này an toàn. Không gửi tệp cho người khác.');}
 const flag=process.argv.indexOf('--trust-local-owner-email');
 if(flag>=0){const email=(process.argv[flag+1]||'').trim().toLowerCase();const owner=(await db.query("SELECT u.id FROM users u JOIN admin_memberships m ON m.user_id=u.id WHERE u.email=$1 AND m.role='owner'",[email])).rows[0];if(!owner)throw Error('Không tìm thấy Owner với email này.');if(!process.stdin.isTTY)throw Error('Xác nhận email Owner cần Terminal tương tác.');const rl=createInterface({input:process.stdin,output:process.stdout});let answer;try{answer=await rl.question('Chỉ tin cậy email Owner trên máy thử cục bộ. Nhập lại chính xác email '+email+': ');}finally{rl.close();}if(answer.trim().toLowerCase()!==email)throw Error('Không khớp email; chưa thay trạng thái xác minh.');await db.query('UPDATE users SET email_verified_at=COALESCE(email_verified_at,clock_timestamp()) WHERE id=$1',[owner.id]);await db.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[owner.id,'owner.email.local-operator-trusted']);console.log('Đã xác nhận email Owner theo thao tác của người vận hành local. Không áp dụng cho đăng ký công khai.');}
 console.log('Khởi động lại backend, mở /admin rồi thiết lập hoặc xác minh ứng dụng Authenticator. Mã TOTP không được tạo bằng email và không hiển thị trong Terminal.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.end().catch(()=>{});if(lock){await lock.close();await unlink(lockPath).catch(()=>{});}}
