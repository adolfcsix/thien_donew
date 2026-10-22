/** Registration failure doctor. READ ONLY. Never displays credentials, email,
 * cookies, SQL error text, or any account records. No registration is attempted.
 *
 * Windows: npm.cmd run check:auth:register
 */
import {ACCOUNT_COLUMNS,analyzeRegistrationSchema} from './lib/registration-readiness.mjs';

const url = process.env.DATABASE_URL || 'postgresql://thiendo:thiendo_dev@localhost:5432/thiendo';
const report = [];
function result(name, ok, advice) {
  report.push({name,ok,advice});
  console.log(`[${ok ? 'PASS' : 'BLOCKED'}] ${name}: ${advice}`);
}
const envSet = Boolean(process.env.DATABASE_URL);
if (!envSet) result('configuration',false,'Chưa nạp DATABASE_URL từ .env; API sẽ dùng giá trị mặc định cho máy phát triển. Kiểm tra file .env và lệnh chạy.');
let target;
try {
  target = new URL(url);
  if (!['postgres:','postgresql:'].includes(target.protocol) || !target.hostname) throw Error('invalid');
} catch {
  result('database-url',false,'DATABASE_URL không phải URL PostgreSQL hợp lệ.');
  process.exit(2);
}
const loopback = new Set(['localhost','127.0.0.1','[::1]']);
if (!loopback.has(target.hostname) && !process.argv.includes('--allow-remote')) {
  result('safety',false,'Mặc định chỉ kiểm tra PostgreSQL trên máy này. Với máy chủ riêng, chạy thêm --allow-remote (vẫn chỉ đọc).');
  process.exit(2);
}
let Client;
try { ({default:{Client}} = await import('pg')); }
catch {
  result('dependencies',false,'Chưa cài gói pg. Chạy npm.cmd ci trước.');
  process.exit(2);
}
const db = new Client({connectionString:url,connectionTimeoutMillis:5000,statement_timeout:5000,options:'-c default_transaction_read_only=on'});
try {
  await db.connect();
  result('database-connection',true,'Kết nối, quyền truy cập và xác thực PostgreSQL thành công.');
  const ledger = await db.query("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS available");
  if (!ledger.rows[0]?.available) {
    result('migration-ledger',false,'Thiếu schema_migrations. Cần chạy npm.cmd run db:migrate sau khi sao lưu nếu là database đang sử dụng.');
  } else {
    const rows=await db.query('SELECT name FROM public.schema_migrations');
    const applied=rows.rows.map(item=>item.name);
    result('migration-ledger',applied.length===36,`${applied.length}/36 migration đã ghi nhận. Chưa đủ thì sao lưu và chạy npm.cmd run db:migrate.`);
    const columns=await db.query(`SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name = ANY($1::text[])`,[Object.keys(ACCOUNT_COLUMNS)]);
    const contract=analyzeRegistrationSchema(applied,columns.rows);
    result('registration-schema',contract.ok,contract.ok ? 'Đủ bảng/cột bắt buộc cho API đăng ký.' :
      `Thiếu migration: ${contract.missingMigrations.join(', ')||'không'}; thiếu bảng/cột: ${contract.missingColumns.join(', ')||'không'}.`);
  }
} catch(error) {
  const code=typeof error?.code==='string'?error.code:'';
  const category=code==='28P01'||code==='28000'?'Sai tài khoản hoặc mật khẩu PostgreSQL':
    code==='3D000'?'Database chưa được tạo':
    code==='42501'?'Tài khoản DB chưa đủ quyền đọc metadata':
    code==='42P01'?'Bảng schema_migrations không tồn tại':
    code==='ECONNREFUSED'?'PostgreSQL chưa chạy hoặc sai cổng':
    code==='ENOTFOUND'?'Không phân giải được máy chủ PostgreSQL':
    code==='ETIMEDOUT'?'Kết nối PostgreSQL quá thời gian chờ':
    'Không truy vấn được PostgreSQL; kiểm tra cấu hình, quyền truy cập và nhật ký server';
  result('database-query',false,category+'. Không in thông tin lỗi hoặc chuỗi kết nối.');
} finally {try {await db.end();} catch { /* ignore cleanup after failed connect */ }}
const blocked=report.filter(entry=>!entry.ok);
console.log(`Kết luận: ${blocked.length ? 'BLOCKED' : 'REGISTRATION_DB_PREREQUISITES_PASS'} (chỉ là kiểm tra cấu hình/schema, KHÔNG xác nhận tạo tài khoản thực tế).`);
if (blocked.length) console.log('Sau khi xử lý DB, khởi động lại dịch vụ API và chạy GET /api/health/ready trước khi đăng ký tài khoản thử.');
process.exitCode=blocked.length?2:0;
