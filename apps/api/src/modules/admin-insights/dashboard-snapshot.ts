import {ADMIN_CAPABILITIES} from '../admin-console/permissions';
import type { PoolClient } from 'pg';
export type DashboardMetric = { id: string; label: string; value: number | null; previous: number | null; unit: string; source: string; scope: 'period' | 'snapshot'; href?: string };
export function metricNumber(raw: unknown): number {
  if ((typeof raw !== 'number' && typeof raw !== 'string') || (typeof raw === 'string' && !/^(0|[1-9]\d*)$/.test(raw))) throw Error('Invalid aggregate');
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0) throw Error('Invalid aggregate');
  return n;
}
/** Only fixed queries enter this module. No personal data leaves the snapshot. */
export async function dashboardSnapshot(client: PoolClient, days: number, trackingEnabled: boolean, capabilities: readonly string[] = ADMIN_CAPABILITIES) {
  const has=(domain:string)=>capabilities.includes(domain+'.read');
  const domains:Record<string,string>={users:'members',charts:'ai',ai:'ai',forum:'community',reports:'community',books:'library',documents:'library',pro:'finance',orders:'finance',revenue:'finance',traffic:'overview'};
  const clock = (await client.query<{start: Date; end: Date}>(`SELECT
    (date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh')-($1::int-1)*INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh' AS start,
    now() AS end`, [days])).rows[0];
  // Previous comparison has exactly the same elapsed duration as the current range.
  const previousStart = new Date(2 * clock.start.getTime() - clock.end.getTime());
  const metrics: DashboardMetric[] = [];
  // Call sites supply only developer-owned SQL literals. One range aggregate
  // computes both half-open periods; parameters contain timestamps only.
  function periodSql(table: string, column = 'created_at', predicate = 'TRUE', aggregate = 'COUNT(*)') {
    return `SELECT COALESCE(${aggregate} FILTER (WHERE ${column} >= $1),0)::text AS n,
      COALESCE(${aggregate} FILTER (WHERE ${column} < $1),0)::text AS previous
      FROM ${table} WHERE ${column} >= $3 AND ${column} < $2 AND (${predicate})`;
  }
  async function metric(id: string, label: string, source: string, sql: string, scope: 'period' | 'snapshot' = 'period', unit = 'lượt', href?: string) {
    if(!has(domains[id.split('.')[0]]))return;
    const row = (await client.query<{n: string; previous?: string}>(sql, scope === 'period' ? [clock.start, clock.end, previousStart] : [])).rows[0];
    const value = metricNumber(row.n);
    const previous = scope === 'period' ? metricNumber(row.previous) : null;
    metrics.push({id, label, source, value, previous, scope, unit, href});
  }
  await metric('users.total', 'Tổng tài khoản', 'users · bản ghi hiện còn', 'SELECT COUNT(*)::text AS n FROM users', 'snapshot', 'tài khoản');
  await metric('users.new', 'Đăng ký mới', 'users.created_at · tài khoản hiện còn', periodSql('users'), 'period', 'tài khoản');
  await metric('charts.saved', 'Lá số đã lưu mới', 'charts.created_at · không bao gồm lần lập chưa lưu', periodSql('charts'));
  await metric('ai.completed', 'Yêu cầu AI hoàn tất', 'ai_usage.created_at/status=completed', periodSql('ai_usage', 'created_at', "status='completed'"));
  await metric('forum.new', 'Bài diễn đàn mới', 'forum_threads.created_at · mọi trạng thái hiện còn', periodSql('forum_threads'), 'period', 'bài', '/admin/forum');
  await metric('reports.open', 'Báo cáo cần xử lý', 'forum_reports.status=open/reviewing · hiện tại', "SELECT COUNT(*)::text AS n FROM forum_reports WHERE status IN ('open','reviewing')", 'snapshot', 'báo cáo', '/admin/forum');
  await metric('books.total', 'Sách đã đăng', 'library_books.status=published · hiện tại', "SELECT COUNT(*)::text AS n FROM library_books WHERE status='published'", 'snapshot', 'sách', '/admin/books');
  await metric('documents.total', 'Tài liệu đã đăng', 'van_kho_documents.status=published · hiện tại', "SELECT COUNT(*)::text AS n FROM van_kho_documents WHERE status='published'", 'snapshot', 'tài liệu', '/admin/van-kho');
  await metric('pro.active', 'Thành viên có quyền Pro', 'pro_entitlements · DISTINCT user_id · hiệu lực hiện tại', 'SELECT COUNT(DISTINCT user_id)::text AS n FROM pro_entitlements WHERE starts_at<=now() AND (expires_at IS NULL OR expires_at>now()) AND revoked_at IS NULL', 'snapshot', 'thành viên');
  await metric('orders.new', 'Đơn hàng tạo mới', 'billing_orders.created_at · mọi trạng thái', periodSql('billing_orders'), 'period', 'đơn', '/admin/finance');
  await metric('orders.pending', 'Giao dịch đang chờ', 'billing_orders.status=creating/pending · hiện tại', "SELECT COUNT(*)::text AS n FROM billing_orders WHERE status IN ('creating','pending')", 'snapshot', 'đơn', '/admin/finance');
  await metric('revenue.gross', 'Tổng thu đã xác nhận', 'billing_orders.paid_at · paid/refunded · tổng thu trước hoàn tiền, chưa trừ phí/thuế', periodSql('billing_orders', 'paid_at', "status IN ('paid','refunded')", 'SUM(amount_vnd)'), 'period', 'VND', '/admin/finance');
  const state = (await client.query<{started_at: Date}>('SELECT started_at FROM web_analytics_state WHERE id=1')).rows[0];
  const tracking = {enabled: trackingEnabled, startedAt: state?.started_at ?? null};
  if (tracking.enabled && tracking.startedAt) await metric('traffic.views', 'Lượt xem trang', 'web_page_views.created_at · sự kiện ghi nhận; không phải người/phiên', periodSql('web_page_views'));
  else metrics.push({id:'traffic.views', label:'Lượt xem trang', value:null, previous:null, unit:'lượt xem', source:'Chưa bật tracking hoặc chưa có sự kiện khởi tạo', scope:'period'});
  for (const [id,label] of [['traffic.sessions','Phiên truy cập'],['users.active','Người dùng hoạt động']].filter(([id])=>id!=='users.active'||has('members'))) metrics.push({id,label,value:null,previous:null,unit:'',source:'Chưa có cơ chế đo tương ứng; không suy ra từ lượt xem hay đăng ký',scope:'period'});
  const daily = (await client.query<{date:string; registrations:string; posts:string; views:string}>(`WITH days AS (
    SELECT generate_series(($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, ($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, INTERVAL '1 day')::date AS day
  ), registrations AS (${has('members')?`SELECT (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,COUNT(*) AS n FROM users WHERE created_at >= $1 AND created_at < $2 GROUP BY 1`:`SELECT NULL::date AS day,0::bigint AS n WHERE FALSE`}),
  posts AS (${has('community')?`SELECT (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,COUNT(*) AS n FROM forum_threads WHERE created_at >= $1 AND created_at < $2 GROUP BY 1`:`SELECT NULL::date AS day,0::bigint AS n WHERE FALSE`}),
  views AS (SELECT (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,COUNT(*) AS n FROM web_page_views WHERE $3::boolean AND created_at >= $1 AND created_at < $2 GROUP BY 1)
  SELECT to_char(d.day,'YYYY-MM-DD') AS date,COALESCE(r.n,0)::text AS registrations,COALESCE(p.n,0)::text AS posts,COALESCE(v.n,0)::text AS views FROM days d LEFT JOIN registrations r USING(day) LEFT JOIN posts p USING(day) LEFT JOIN views v USING(day) ORDER BY d.day`, [clock.start,clock.end,Boolean(tracking.enabled && tracking.startedAt)])).rows.map(r=>({date:r.date,registrations:has('members')?metricNumber(r.registrations):null,posts:has('community')?metricNumber(r.posts):null,views:tracking.enabled&&tracking.startedAt?metricNumber(r.views):null}));
  const orders = has('finance')?(await client.query<{status:string;n:string}>('SELECT status,COUNT(*)::text AS n FROM billing_orders GROUP BY status ORDER BY status')).rows.map(r=>({status:r.status,count:metricNumber(r.n)})):[];
  return {start:clock.start,end:clock.end,previousStart,generatedAt:clock.end,timeZone:'Asia/Ho_Chi_Minh',days,metrics,daily,orders,tracking,restricted:['members','community','ai','library','finance'].filter(domain=>!has(domain)),
    warnings:[...(['members','community','ai','library','finance'].some(domain=>!has(domain))?['Một số số liệu không được tải vì ngoài phạm vi quyền của tài khoản.']:[]),'So sánh với khoảng liền trước có cùng thời lượng; chỉ áp dụng số liệu theo kỳ.', 'Số liệu hiện còn trong database; bản ghi đã xóa không được khôi phục vào thống kê.', 'Tracking trình duyệt có thể thiếu do DNT/chặn mạng; lưu sự kiện 90 ngày. Kỳ trước ngày bật tracking không đủ dữ liệu.', 'Tình trạng database: truy vấn thành công tại thời điểm chụp; không thay thế giám sát hạ tầng.']};
}
