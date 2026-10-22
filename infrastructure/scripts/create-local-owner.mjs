/**
 * One-time, local-only first Owner provisioning tool.
 * Never embeds a password in source, overwrites existing users, or resets existing owners/MFA.
 * Requires physical/operator access to local PostgreSQL and explicit interactive confirmation.
 */
import { randomBytes, randomUUID, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, writeFile, rename, unlink, lstat } from 'node:fs/promises';
import {isValidMfaKey,initialMfaEnv} from './lib/initial-mfa-env.mjs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const scrypt = promisify(scryptCallback);
const emailIndex = process.argv.indexOf('--email');
const rawEmail = emailIndex >= 0 ? process.argv[emailIndex + 1] : '';
const email = rawEmail?.trim().toLowerCase() || '';
const username = 'thiendo_owner';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function fail(message) { throw new Error(message); }
function validateSettings() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
    fail('Email khong hop le. Hay nhap email that cua ban.');
  }
  if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
    fail('Script chi duoc dung khi khoi tao MAY LOCAL, khong chay production/CI.');
  }
  if (!process.env.DATABASE_URL) fail('Chua co DATABASE_URL trong .env');
  let address;
  try { address = new URL(process.env.DATABASE_URL); } catch { fail('DATABASE_URL khong hop le'); }
  if (!['postgresql:', 'postgres:'].includes(address.protocol) || !LOCAL_HOSTS.has(address.hostname)) {
    fail('Tu choi: database phai o localhost/127.0.0.1. Khong ket noi database tren Internet.');
  }
  if(address.search||address.hash)fail('Tu choi tham so/fragment trong DATABASE_URL cua cong cu Owner local.');
  if (process.env.ADMIN_MFA_ENCRYPTION_KEY && !isValidMfaKey(process.env.ADMIN_MFA_ENCRYPTION_KEY)) {
    fail('Khoa ADMIN_MFA_ENCRYPTION_KEY dang sai. Khong ghi de khoa MFA cu.');
  }
  return address;
}

async function ensureFirstMfaKey(db) {
  if (isValidMfaKey(process.env.ADMIN_MFA_ENCRYPTION_KEY || '')) return false;
  const saved = await db.query('SELECT EXISTS(SELECT 1 FROM admin_mfa_credentials) AS existing');
  if (saved.rows[0]?.existing) fail('Database da co khoa MFA. Khong tu dong tao khoa moi de tranh mat quyen truy cap.');
  const envPath = resolve(process.cwd(), '.env');
  const envText = await readFile(envPath, 'utf8').catch(() => fail('Khong thay .env trong thu muc du an.'));
  const key = randomBytes(32).toString('base64');
  const updated=initialMfaEnv(envText,key),temporary=envPath+'.owner-'+randomUUID()+'.tmp';
  try{
    const metadata=await lstat(envPath);
    if(!metadata.isFile())fail('.env khong phai tep cau hinh thong thuong.');
    await writeFile(temporary,updated,{mode:0o600,flag:'wx'});
    if(await readFile(envPath,'utf8')!==envText)fail('.env vua thay doi. Hay kiem tra lai, khong ghi de.');
    await rename(temporary,envPath);
  }finally{await unlink(temporary).catch(()=>{});}
  return true;
}

let db;
let secret;
try {
  // Validate the local-only connection string before loading a database driver.
  // An unsafe URL must be rejected even on a clean Windows machine where npm ci
  // has not yet installed pg, and no connection attempt is permitted before consent.
  validateSettings();
  let pg;
  try { pg = (await import('pg')).default; }
  catch (reason) {
    if (reason?.code === 'ERR_MODULE_NOT_FOUND') {
      fail('Thieu thu vien PostgreSQL pg. Hay chay npm ci tai thu muc du an (khong sua package-lock.json).');
    }
    throw reason;
  }
  console.log('\nTHIEN DO - KHOI TAO OWNER LOCAL (CHI LAN DAU)');
  console.log('Username: thiendo_owner');
  console.log('Email: ' + email);
  console.log('Chu y: Chuc nang nay chi su dung voi database tren may LOCAL.');
  console.log('Neu da co Owner, thao tac SE BI TU CHOI va khong doi mat khau.\n');
  const prompt = createInterface({input:stdin, output:stdout});
  let consent;
  try { consent = (await prompt.question('Go TAO OWNER de xac nhan: ')).trim(); }
  finally { prompt.close(); }
  if (consent !== 'TAO OWNER') fail('Da huy theo yeu cau.');

  db = new pg.Client({ connectionString:process.env.DATABASE_URL, connectionTimeoutMillis:10000, statement_timeout:10000 });
  await db.connect();
  await db.query('BEGIN');
  await db.query('SELECT pg_advisory_xact_lock(20261014,13)');
  const owner = await db.query("SELECT EXISTS(SELECT 1 FROM admin_memberships WHERE role='owner') AS existing");
  if (owner.rows[0]?.existing) fail('Da co Owner. Khong tao/ghi de tai khoan. Su dung tai khoan Owner cu hoac quy trinh khoi phuc duoc phe duyet.');
  const oldUser = await db.query('SELECT id FROM users WHERE email=$1 OR LOWER(username)=$2', [email,username]);
  if (oldUser.rows.length) fail('Email hoac username da ton tai. Vui long dung tai khoan da dang ky va bootstrap-owner.mjs; khong ghi de password.');

  // Only during local first-owner initialization: the operator directly provisions
  // and trusts the provided email. Public signups must still verify inbox ownership.
  const createdKey = await ensureFirstMfaKey(db);
  secret = randomBytes(24).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(secret, salt, 64, {N:16384,r:8,p:1})).toString('hex');
  const id = randomUUID();
  await db.query('INSERT INTO users(id,email,password_hash,salt,username,email_verified_at) VALUES($1,$2,$3,$4,$5,NOW())',
    [id,email,hash,salt,username]);
  await db.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[id]);
  await db.query('INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,$2,$3,$4)',
    [id,'owner.bootstrap.local',id,JSON.stringify({method:'local-initial-provision',emailTrust:'offline-operator'})]);
  await db.query('INSERT INTO account_security_events(user_id,event) VALUES($1,$2)',[id,'owner.bootstrap.local']);
  await db.query('COMMIT');
  console.log('\nTAO TAI KHOAN OWNER THANH CONG!');
  console.log('Username : ' + username);
  console.log('Email    : ' + email);
  console.log('MAT KHAU : ' + secret);
  console.log('\nHay ghi lai mat khau va KHONG chia se anh man hinh.');
  if (createdKey) console.log('Da tao khoa MFA mot lan vao .env (khong in khoa ra man hinh).');
  console.log('Khoi dong lai frontend/backend, mo http://localhost:3000/admin');
  console.log('Dang nhap, sau do ket noi ung dung Authenticator de xac minh 2 buoc.');
  console.log('Khong dua .env len GitHub, khong chia se mat khau qua chat.');
} catch (error) {
  if (db) await db.query('ROLLBACK').catch(() => {});
  console.error('KHONG TAO TAI KHOAN:', error instanceof Error ? error.message : 'Loi chua xac dinh');
  process.exitCode = 1;
} finally {
  if (db) await db.end().catch(() => {});
  secret = undefined;
}
