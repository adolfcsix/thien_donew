/** Read-only diagnosis: never grant a role, reset MFA, or print secrets. */
import pg from 'pg';

const index = process.argv.indexOf('--email');
const email = index >= 0 ? process.argv[index + 1]?.trim().toLowerCase() : '';
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !process.env.DATABASE_URL) {
  throw Error('Cần DATABASE_URL và --email của tài khoản cần kiểm tra.');
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
try {
  await db.connect();
  await db.query('BEGIN READ ONLY');
  const result = await db.query(`SELECT
    EXISTS(SELECT 1 FROM users WHERE email=$1) AS "accountExists",
    EXISTS(SELECT 1 FROM admin_memberships WHERE role='owner') AS "ownerExists",
    (SELECT m.role FROM admin_memberships m JOIN users u ON u.id=m.user_id WHERE u.email=$1) AS role,
    EXISTS(SELECT 1 FROM users WHERE email=$1 AND email_verified_at IS NOT NULL) AS "emailVerified",
    EXISTS(SELECT 1 FROM account_blocks b JOIN users u ON u.id=b.user_id WHERE u.email=$1) AS blocked,
    EXISTS(SELECT 1 FROM admin_mfa_credentials m JOIN users u ON u.id=m.user_id WHERE u.email=$1 AND m.enabled_at IS NOT NULL) AS "mfaEnabled",
    EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.email=$1 AND s.expires_at>clock_timestamp()) AS "activeSession"`, [email]);
  await db.query('COMMIT');
  const key = process.env.ADMIN_MFA_ENCRYPTION_KEY || '';
  console.log(JSON.stringify({ ...result.rows[0], mfaKeyConfigured: /^[A-Za-z0-9+/]{43}=$/.test(key) && Buffer.from(key, 'base64').length === 32 }, null, 2));
} catch (error) {
  // Driver messages can contain connection/account details: only report a safe code.
  console.error('Chưa kiểm tra được Admin. Kiểm tra kết nối và migrations. Mã:', /^[A-Z0-9]{5}$/.test(error.code || '') ? error.code : 'CONNECTION_OR_CONFIG');
  process.exitCode = 1;
} finally {
  await db.end().catch(() => {});
}
