'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useVisiblePolling } from '@/features/membership/use-visible-polling';
import { api } from '@/lib/api';
import { formatVnd as money, paymentStateNames as states } from '@/features/membership/billing-presentation';
import { requestKey, bindOrder, settleOrders, type CheckoutIntents } from '@/features/membership/checkout-intents';
import styles from '@/features/membership/membership.module.css';
import reading from '@/features/membership/reading.module.css';
type Plan = {
    id: string;
    name: string;
    priceVnd: number;
    enabled: boolean;
    advisor: string;
    scope: string;
    responseHours: number;
    questionLimit: number;
};
type RequestRow = {
    id: string;
    planName: string;
    amountVnd: number;
    status: string;
    question: string;
    advisor: string;
    scope: string;
    responseHours: number;
    questionLimit: number;
    serviceStatus: string;
    contactUrl: string | null;
    checkoutUrl: string | null;
    expiresAt: string;
};
const serviceStates: Record<string, string> = { waiting: 'Chờ tiếp nhận', in_progress: 'Đang tư vấn', completed: 'Đã hoàn thành' };
export default function Consultation() {
    const [plans, setPlans] = useState<Plan[]>([]), [requests, setRequests] = useState<RequestRow[]>([]), [charts, setCharts] = useState<{
        id: string;
        label: string;
    }[]>([]), [enabled, setEnabled] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [chartId, setChartId] = useState(''), [question, setQuestion] = useState(''), [selected, setSelected] = useState('');
    const key = useRef<CheckoutIntents>({});
    async function load(signal?: AbortSignal) { const [p, r, c] = await Promise.all([api<{
            plans: Plan[];
            checkoutEnabled: boolean;
        }>('/api/billing/consultation-plans', { signal }), api<{
            requests: RequestRow[];
        }>('/api/billing/consultations', { signal }), api<{
            charts: {
                id: string;
                label: string;
            }[];
        }>('/api/charts', { signal, timeoutMs: 30000 })]); if (signal?.aborted)
        return; setPlans(p.plans); setEnabled(p.checkoutEnabled); setRequests(r.requests); settleOrders(key.current, r.requests); setCharts(c.charts); }
    useEffect(() => { const c = new AbortController(); void load(c.signal).catch(e => { if (!c.signal.aborted)
        setError(e.message); }).finally(() => { if (!c.signal.aborted)
        setLoading(false); }); return () => c.abort(); }, []);
    const pending = requests.some(r => ['pending', 'creating'].includes(r.status) && new Date(r.expiresAt) > new Date());
    useVisiblePolling(!busy && !loading && pending, async (signal) => { const r = await api<{
        requests: RequestRow[];
    }>('/api/billing/consultations', { signal, timeoutMs: 15000 }); if (!signal.aborted) {
        setRequests(r.requests);
        settleOrders(key.current, r.requests);
    } });
    async function buy() { setBusy(true); setError(''); try {
        const payload = JSON.stringify({ planId: selected, chartId, question: question.trim() });
        const intent = requestKey(key.current, payload);
        const r = await api<{
            order: {
                id: string;
                checkoutUrl: string | null;
            };
        }>('/api/billing/orders', { method: 'POST', body: { ...JSON.parse(payload), requestKey: intent }, timeoutMs: 20000 });
        bindOrder(key.current, payload, r.order.id);
        await load();
        if (r.order.checkoutUrl)
            window.location.assign(r.order.checkoutUrl);
        else
            setError('Đơn đã lưu, đang chờ link thanh toán. Kiểm tra đơn trước khi thử lại.');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function paymentAction(id: string, operation: 'reconcile' | 'cancel') { if (operation === 'cancel' && !confirm('Hủy đơn chưa thanh toán?'))
        return; setBusy(true); setError(''); try {
        await api('/api/billing/orders/' + id + '/' + operation, { method: 'POST', timeoutMs: 20000 });
        await load();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function copyRequest(request: RequestRow) {
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText('Thiên Đồ · Đơn ' + request.id + '\n' + request.question);
        } catch {
            setError('Không sao chép được. Bạn có thể chọn mã đơn và câu hỏi để sao chép thủ công.');
        }
    }
    const plan = plans.find(p => p.id === selected);
    return <div className={`${styles.page} ${reading.page}`}><header className={reading.hero}><div className={reading.heroCopy}><span className={reading.eyebrow}>THIÊN ĐỒ / LUẬN GIẢI CÁ NHÂN</span><h1 className="serif">Hiểu lá số.<br /><em>Thấu câu chuyện của bạn.</em></h1><p>Một phiên trao đổi riêng cùng người luận giải, dành cho những câu hỏi cần được lắng nghe và phân tích trong hoàn cảnh của bạn.</p><div className={styles.actions}><a className={styles.button} href="#reading-packages">Khám phá phiên luận giải ↓</a><Link href="/membership">Công cụ miễn phí &amp; Pro ↗</Link></div></div><div className={reading.seal} aria-hidden="true"><span>THIÊN ĐỒ</span><b className="serif">Luận<br />giải</b><small>LẮNG NGHE · ĐỐI CHIẾU · THẤU HIỂU</small></div></header>{error && <p role="alert" className={styles.notice}>{error}</p>}{loading && <p role="status">Đang tải gói tư vấn…</p>}<div className={reading.offering} id="reading-packages">{plans.map(p => <section key={p.id} className={`${styles.card} ${reading.package}`}><div className={reading.packageTop}><span className={reading.eyebrow}>PHIÊN LUẬN GIẢI RIÊNG</span><span className={styles.badge}>{p.enabled ? 'Đang nhận đặt phiên' : 'Sắp mở đăng ký'}</span></div><h2 className="serif">{p.name}</h2><p className={reading.packageIntro}>Dành thời gian cho một lá số, một câu chuyện và những điều bạn muốn hiểu rõ hơn.</p><div className={reading.price}>{p.enabled ? money(p.priceVnd) : 'Đang chuẩn bị'}<small>Một lần thanh toán · Một phiên trao đổi</small></div><div className={reading.advisor}><span aria-hidden="true" className={reading.advisorMark}>✧</span><div><small>NGƯỜI ĐỒNG HÀNH</small><p>{p.advisor || 'Được công bố khi mở đăng ký'}</p></div></div><p className={styles.body}>{p.scope || 'Phạm vi tư vấn đang được chuẩn bị. Chưa nhận đặt mua.'}</p><ul className={reading.benefits}><li><span aria-hidden="true">✓</span><div><strong>{p.questionLimit} câu hỏi cá nhân</strong><small>Theo phạm vi của phiên luận giải.</small></div></li><li><span aria-hidden="true">✓</span><div><strong>Trao đổi riêng, có người phụ trách</strong><small>Thông tin liên hệ được mở sau khi thanh toán được xác nhận.</small></div></li><li><span aria-hidden="true">✓</span><div><strong>Phản hồi đầu tiên trong {p.responseHours} giờ</strong><small>Từ khi bạn gửi mã đơn và câu hỏi cho người luận giải.</small></div></li></ul><button className={styles.primary} disabled={loading || busy || !p.enabled || !enabled} onClick={() => { setSelected(p.id); setTimeout(() => document.getElementById('reading-checkout')?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }), 0); }}>Đặt phiên luận giải</button>{(!p.enabled || !enabled) && <p className={styles.muted}>Chưa nhận thanh toán cho gói này.</p>}</section>)}<section className={reading.process}><span className={reading.eyebrow}>HÀNH TRÌNH CỦA BẠN</span><h2 className="serif">Từ câu hỏi<br />đến cuộc trò chuyện.</h2><ol><li><b>01</b><div><strong>Chọn điều muốn hiểu</strong><p>Chọn lá số đã lưu và chia sẻ câu hỏi theo phạm vi của phiên.</p></div></li><li><b>02</b><div><strong>Xác nhận phiên luận giải</strong><p>Xem lại quyền lợi, thông tin người phụ trách và thanh toán QR.</p></div></li><li><b>03</b><div><strong>Bắt đầu trao đổi riêng</strong><p>Mở thông tin liên hệ trong phiên đã thanh toán và gửi mã đơn.</p></div></li></ol><p>Bạn vẫn sử dụng các công cụ miễn phí sau đăng nhập. Gói này trả phí cho phần trao đổi riêng, không tự mở quyền Pro.</p><p className={styles.muted}>Nội dung tư vấn mang tính tham khảo, không cam kết kết quả tương lai. Hãy đọc phạm vi gói trước khi mua.</p></section></div>
 {plan && <section id="reading-checkout" className={`${styles.card} ${reading.checkout}`}><div className={reading.packageTop}><span className={reading.eyebrow}>CHUẨN BỊ PHIÊN LUẬN GIẢI</span><button disabled={busy} onClick={() => setSelected('')}>Đóng</button></div><h2 className="serif">{plan.name}</h2><p>{money(plan.priceVnd)} · {plan.advisor} · {plan.questionLimit} câu hỏi</p><p className={styles.body}>{plan.scope}</p><form className={styles.form} onSubmit={e => { e.preventDefault(); void buy(); }}><label>Lá số của bạn<select required value={chartId} disabled={busy} onChange={e => setChartId(e.target.value)}><option value="">Chọn lá số đã lưu</option>{charts.map(c => <option value={c.id} key={c.id}>{c.label}</option>)}</select></label>{!charts.length && <Link href="/chart">Lập và lưu lá số trước ↗</Link>}<label>Điều bạn muốn trao đổi<textarea required maxLength={2000} rows={5} value={question} disabled={busy} onChange={e => setQuestion(e.target.value)} placeholder="Nêu vấn đề và những câu hỏi theo phạm vi gói…"/></label><label><input type="checkbox" required disabled={busy}/>Tôi đã đọc quyền lợi và đồng ý gửi thông tin lá số, câu hỏi cho người phụ trách luận giải.</label><button className={styles.primary} disabled={busy || !enabled || !plan.enabled || !question.trim() || !chartId}>Tiến hành thanh toán · {money(plan.priceVnd)}</button></form></section>}
 <section className={styles.card} style={{ marginTop: 20 }}><div className={styles.toolbar}><h2>Phiên luận giải của bạn</h2><button disabled={busy||loading} onClick={() => { setBusy(true); setError(''); load().catch(e => setError(e.message)).finally(() => setBusy(false)); }}>Làm mới</button></div>{!loading&&!error&&!requests.length && <p>Những phiên luận giải đã đặt sẽ được lưu ở đây.</p>}{requests.map(r => <article key={r.id} style={{ borderTop: '1px solid var(--line)', padding: '20px 0' }}><h3>{r.planName} · {money(r.amountVnd)}</h3><p>{states[r.status] || r.status}{r.status === 'paid' ? ' · ' + serviceStates[r.serviceStatus] : ''}</p><p>Mã đơn: <strong style={{ overflowWrap: 'anywhere' }}>{r.id}</strong></p><p>Người tư vấn: {r.advisor} · Tối đa {r.questionLimit} câu hỏi · Phản hồi đầu tiên trong {r.responseHours} giờ sau khi liên hệ.</p><p className={styles.body}>{r.scope}</p><details><summary>Câu hỏi đã gửi</summary><p className={styles.body}>{r.question}</p></details><div className={styles.actions}>{r.contactUrl && <><a className={styles.button} href={r.contactUrl} target="_blank" rel="noopener noreferrer">Liên hệ người luận giải ↗</a><button onClick={() => copyRequest(r)}>Sao chép mã đơn &amp; câu hỏi</button></>}{!['paid', 'refunded', 'cancelled'].includes(r.status) && <button disabled={busy || !enabled} onClick={() => paymentAction(r.id, 'reconcile')}>Kiểm tra thanh toán</button>}{r.status === 'pending' && r.checkoutUrl && new Date(r.expiresAt) > new Date() && <a href={r.checkoutUrl}>Tiếp tục thanh toán ↗</a>}{r.status === 'pending' && <button disabled={busy || !enabled} onClick={() => paymentAction(r.id, 'cancel')}>Hủy đơn</button>}</div></article>)}<p className={styles.muted}>Thiên Đồ không tự gửi tin nhắn hoặc đọc hội thoại riêng của bạn. Bạn chủ động nhắn mã đơn và câu hỏi; người tư vấn đối chiếu đơn đã thanh toán trong admin.</p></section></div>;
}
