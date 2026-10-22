'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BankPaymentInfo from '@/features/membership/bank-payment-info';
import { useVisiblePolling } from '@/features/membership/use-visible-polling';
import { api } from '@/lib/api';
import { formatVnd as money, paymentStateNames as stateNames } from '@/features/membership/billing-presentation';
import { requestKey, bindOrder, settleOrders, type CheckoutIntents } from '@/features/membership/checkout-intents';
import styles from '@/features/membership/membership.module.css';
type Plan = {
    id: string;
    name: string;
    priceVnd: number;
    days: number;
    features: string[];
    enabled: boolean;
};
type Order = {
    id: string;
    planName: string;
    amountVnd: number;
    status: string;
    checkoutUrl: string | null;
    expiresAt: string;
};
export default function Membership() {
    const [plans, setPlans] = useState<Plan[]>([]), [orders, setOrders] = useState<Order[]>([]), [access, setAccess] = useState<{
        features: string[];
        expiresAt: string | null;
    }>({ features: [], expiresAt: null }), [enabled, setEnabled] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
    const keys = useRef<CheckoutIntents>({});
    async function load(signal?: AbortSignal) { const [p, o, a] = await Promise.all([api<{
            plans: Plan[];
            checkoutEnabled: boolean;
        }>('/api/billing/plans', { signal, timeoutMs: 15000 }), api<{
            orders: Order[];
        }>('/api/billing/orders', { signal, timeoutMs: 15000 }), api<typeof access>('/api/billing/access', { signal, timeoutMs: 15000 })]); if (signal?.aborted)
        return; setPlans(p.plans); setEnabled(p.checkoutEnabled); setOrders(o.orders); settleOrders(keys.current, o.orders); setAccess(a); }
    useEffect(() => { const c = new AbortController(); void load(c.signal).catch(e => { if (!c.signal.aborted)
        setError(e.message); }).finally(() => { if (!c.signal.aborted)
        setLoading(false); }); return () => c.abort(); }, []);
    useVisiblePolling(!busy && !loading && orders.some(o => ['pending', 'creating'].includes(o.status) && new Date(o.expiresAt) > new Date()), async (signal) => { const [o, a] = await Promise.all([api<{
            orders: Order[];
        }>('/api/billing/orders', { signal, timeoutMs: 15000 }), api<typeof access>('/api/billing/access', { signal, timeoutMs: 15000 })]); if (!signal.aborted) {
        setOrders(o.orders);
        settleOrders(keys.current, o.orders);
        setAccess(a);
    } });
    async function checkout(p: Plan) { setBusy(true); setError(''); try {
        const payload = JSON.stringify({ planId: p.id });
        const key = requestKey(keys.current, payload);
        const r = await api<{
            order: Order;
        }>('/api/billing/orders', { method: 'POST', body: { planId: p.id, requestKey: key }, timeoutMs: 20000 });
        bindOrder(keys.current, payload, r.order.id);
        await load();
        if (r.order.checkoutUrl)
            window.location.assign(r.order.checkoutUrl);
        else
            setError('Đơn đã lưu nhưng chưa có link. Hãy kiểm tra trạng thái đơn trước khi tạo đơn khác.');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function cancel(id: string) { if (!confirm('Hủy đơn chưa thanh toán?'))
        return; setBusy(true); setError(''); try {
        await api('/api/billing/orders/' + id + '/cancel', { method: 'POST', timeoutMs: 20000 });
        await load();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function sync(id: string) { setBusy(true); setError(''); try {
        await api('/api/billing/orders/' + id + '/reconcile', { method: 'POST', timeoutMs: 20000 });
        await load();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    useEffect(()=>{if(!loading)window.dispatchEvent(new Event('thiendo:access-changed'));},[loading,access.expiresAt,access.features.join(',')]);
    return <div className={styles.page}><header className={styles.hero}><span className={styles.badge}>THIÊN ĐỒ · THÀNH VIÊN</span><h1 className="serif">Trải nghiệm rộng. Nghiên cứu sâu.</h1><Link href="/consultation">Đặt phiên luận giải cá nhân ↗</Link><p>Các công cụ lập lá số, quẻ, bàn, luận giải đang hỗ trợ và xuất cơ bản vẫn miễn phí sau đăng nhập. Pro dành cho bộ báo cáo nghiên cứu nâng cao và đối chiếu nhiều lá số.</p></header>{error && <p role="alert" className={styles.notice}>{error}</p>}{loading && <p role="status">Đang tải quyền lợi…</p>}<div className={styles.grid}><section className={styles.card}><h2>Thành viên miễn phí</h2><div className={styles.price}>0 ₫</div><p>Lập đầy đủ kết quả theo phạm vi hiện có; đọc nội dung cơ bản và nhiều nội dung chuyên sâu; lưu hồ sơ; xuất cơ bản và JSON sao lưu.</p><Link href="/huyen-hoc">Khám phá các bộ môn ↗</Link></section>{plans.map(p => <section className={styles.card} key={p.id}><h2>{p.name}</h2><div className={styles.price}>{p.enabled ? money(p.priceVnd) : 'Chưa mở bán'}</div><p>{p.days} ngày · Không tự động gia hạn.</p><ul>{p.features.map(f => <li key={f}>{f === 'premium-report' ? 'Báo cáo nghiên cứu cá nhân, in/lưu PDF' : f === 'multi-chart-report' ? 'Bộ báo cáo đối chiếu 2–5 lá số' : f}</li>)}</ul><button className={styles.primary} disabled={busy || loading || !enabled || !p.enabled} onClick={() => checkout(p)}>Thanh toán qua payOS</button>{(!enabled || !p.enabled) && <p className={styles.muted}>Thanh toán chưa bật. Không có giao dịch hay khoản phí nào được tạo.</p>}</section>)}</div><section className={styles.card} style={{ marginTop: 18 }}><h2>Quyền và đơn hàng của bạn</h2>{!loading&&!error&&<p>{access.features.length ? `Đang có quyền Pro · tới ${new Date(access.expiresAt!).toLocaleString('vi-VN')}` : 'Bạn đang dùng tài khoản miễn phí.'}</p>}<div className={styles.actions}><Link className={styles.button} href="/pro/research">Mở phòng báo cáo nghiên cứu ↗</Link><button disabled={busy||loading} onClick={() => { setBusy(true); setError(''); load().catch(e => setError(e.message)).finally(() => setBusy(false)); }}>Làm mới</button></div><div className={styles.table}><table><thead><tr><th>Gói</th><th>Giá</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td>{o.planName}<br /><small>{o.id}</small></td><td>{money(o.amountVnd)}</td><td>{stateNames[o.status] || o.status}</td><td>{!['paid', 'refunded', 'cancelled'].includes(o.status) && <button disabled={busy || !enabled} onClick={() => sync(o.id)}>Kiểm tra thanh toán</button>}{o.status === 'pending' && o.checkoutUrl && new Date(o.expiresAt) > new Date() && <a href={o.checkoutUrl}>Tiếp tục thanh toán ↗</a>}{o.status === 'pending' && <button disabled={busy || !enabled} onClick={() => cancel(o.id)}>Hủy đơn chưa trả</button>}</td></tr>)}</tbody></table></div>{!loading&&!error&&!orders.length && <p className={styles.muted}>Chưa có đơn hàng.</p>}<p className={styles.muted}>Quay lại từ trang thanh toán chưa đồng nghĩa đã trả tiền. Quyền chỉ được mở sau khi server xác nhận giao dịch. Hồ sơ của bạn vẫn được giữ khi Pro hết hạn.</p></section><BankPaymentInfo /><p className={styles.muted}><Link href="/chinh-sach-thanh-toan">Quy trình thanh toán, hủy và hoàn tiền ↗</Link></p></div>;
}
