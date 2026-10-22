import Link from 'next/link';
import type { InsightReport } from './contract';
import styles from './chat.module.css';
const reportReasons:Record<string,string>={spam:'Spam',abuse:'Lạm dụng',privacy:'Quyền riêng tư',misinformation:'Thông tin sai',copyright:'Bản quyền',other:'Khác'};
const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh'
});
export function InsightAnswer({
  report
}: {
  report: InsightReport;
}) {
  return <article aria-label="Báo cáo dữ liệu quản trị" className={styles.answer}>
    <h2>Số liệu gốc từ hệ thống</h2>
    <p>Từ {formatDate(report.start)} đến {formatDate(report.end)} (không gồm mốc cuối) · múi giờ Việt Nam.</p>
    <p>Ảnh chụp dữ liệu: {formatDate(report.generatedAt)}. Hỏi lại để lấy báo cáo mới.</p>
    {report.tracking?.startedAt && <p>Bắt đầu ghi lượt xem: {formatDate(report.tracking.startedAt)}.</p>}
    {report.facts.map(fact => <section key={fact.id}>
      <h3>{fact.label}: {fact.value.toLocaleString('vi-VN')}</h3>
      <p>Nguồn: {fact.source} · mã {fact.id}</p>
    </section>)}
    {report.warnings.map((warning, index) => <p key={index} className={styles.note}>
      {warning}
    </p>)}
    {report.ranks && <section>
      <h3>Hồ sơ cảnh giới công khai</h3>
      <p>Đã xét {report.ranks.scanned} ứng viên; {report.ranks.matchingInSample} hồ sơ cấp {report.ranks.minLevel}+ trong mẫu. {report.ranks.truncated ? 'Mẫu chưa bao phủ toàn hệ thống.' : ''}</p>
      {!report.ranks.entries.length ? <p>Không tìm thấy hồ sơ phù hợp trong phạm vi đã xét.</p> : report.ranks.entries.map(member => <p key={member.userId}>
            <Link href={'/forum/members/' + member.userId}>
          {member.displayName}
        </Link> · cấp {member.level} — {member.rankName} · {member.points} Tinh Văn · {member.rankSource === 'admin' ? 'Cấp thủ công' : 'Tích lũy đóng góp'}
          </p>)}
    </section>}
    {!!report.queues?.orders.length&&<section><h3>Đơn đang chờ · tối đa 30 đơn cũ nhất</h3><div className={styles.queueTable}><table><thead><tr><th>Mã đơn</th><th>Số tiền</th><th>Trạng thái</th></tr></thead><tbody>{report.queues.orders.map(o=><tr key={o.id}><td><Link href="/admin/finance">{o.id}</Link></td><td>{o.amountVnd.toLocaleString('vi-VN')} ₫</td><td>{o.status==='pending'?'Chờ thanh toán':'Đang tạo'}</td></tr>)}</tbody></table></div></section>}
    {!!report.queues?.reports.length&&<section><h3>Báo cáo cần duyệt · tối đa 30 báo cáo cũ nhất</h3><ul>{report.queues.reports.map(r=><li key={r.id}><Link href="/admin/forum">{r.id}</Link> · {reportReasons[r.reason]||'Khác'} · {r.status==='open'?'Chờ xử lý':'Đang xem xét'}</li>)}</ul></section>}
    <nav className={styles.reportLinks} aria-label="Mở phân hệ liên quan">{report.facts.some(f=>f.id.startsWith('finance.'))&&<Link href="/admin/finance">Đối soát tài chính ↗</Link>}{report.facts.some(f=>f.id==='system.reports')&&<Link href="/admin/forum">Hàng đợi kiểm duyệt ↗</Link>}{report.facts.some(f=>f.id.startsWith('library.'))&&<Link href="/admin/books">Quản lý thư viện ↗</Link>}</nav>
    {report.aiError && <p role="status" className={styles.note}>
      {report.aiError}
    </p>}
    {report.interpretation && <section>
      <h2>Gemini hỗ trợ diễn giải</h2>
      <p>Đối chiếu với bảng gốc; diễn giải AI vẫn có thể sai. Mô hình: {report.interpretation.model}.</p>
      <p>
        {report.interpretation.summary}
      </p>
      {report.interpretation.findings.map((finding, index) => <p key={index}>{finding.text} · Căn cứ: {finding.evidenceIds.join(', ')}</p>)}
    </section>}
  </article>;
}
