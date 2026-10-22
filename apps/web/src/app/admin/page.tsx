'use client';
import consoleCss from '@/features/admin-console/console.module.css';
import {adminLinks} from '@/features/admin-console/model';
import {AdminMembers} from '@/features/admin-console/members';
import { AdminDashboard } from '@/features/admin-dashboard/dashboard';
import dashboardStyles from '@/features/admin-dashboard/dashboard.module.css';
import { useEffect, useRef, useState } from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import AdminConsultations from '@/features/membership/admin-consultations';
import { useAdminSession } from '@/features/membership/admin-session';
import { api } from '@/lib/api';
import { formatVnd as money, paymentStateNames as stateNames } from '@/features/membership/billing-presentation';
import styles from '@/features/membership/membership.module.css';
type User = {
    id: string;
    email: string;
    displayName: string | null;
    role: string | null;
    blocked: boolean;
};
type Plan = {
    id: string;
    name: string;
    priceVnd: number;
    days: number;
    features: string[];
    enabled: boolean;
};
type Row = Record<string, any>;
const tabs = ['Tổng quan', 'Tài khoản', 'Gói Pro', 'Đơn & quyền', 'Nội dung', 'Nhật ký', 'Luận giải cá nhân'];
export default function Admin() {
    const { access, reverify, capabilities } = useAdminSession();
    const [tab, setTab] = useState(0), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [users, setUsers] = useState<User[]>([]), [plans, setPlans] = useState<Plan[]>([]), [orders, setOrders] = useState<Row[]>([]), [grants, setGrants] = useState<Row[]>([]), [events, setEvents] = useState<Row[]>([]), [posts, setPosts] = useState<Row[]>([]), [gateway, setGateway] = useState(false), [grant, setGrant] = useState({ userId: '', days: 30, reason: '' }), [post, setPost] = useState<{
        id?: string;
        revision?: number;
        slug: string;
        title: string;
        body: string;
        published: boolean;
    }>({ slug: '', title: '', body: '', published: false, revision:0 });
    const tabCaps=['overview.read','members.read','finance.read','finance.read','content.read','audit.read','finance.read'];
    const params=useSearchParams();const panel=params.get('panel');
    useEffect(()=>{const index=panel==='plans'?2:panel==='consultations'?6:panel==='orders'?3:0;setTab(index===0||capabilities.includes(tabCaps[index])?index:0);},[panel,capabilities]);
    const [dataLoading, setDataLoading] = useState(false);
    const readSequence = useRef(0);
    const mutationPending = useRef(false);
    async function load(target = tab, signal?: AbortSignal) {
        const sequence = ++readSequence.current;
        if(!capabilities.includes(tabCaps[target]))return;
        setDataLoading(true);
        const options = { signal, timeoutMs: 15000 };
        const current = () => sequence === readSequence.current && !signal?.aborted;
        try {
            if (target === 0) {
                const p = await api<{checkoutEnabled: boolean}>('/api/billing/plans', options);
                if (current()) setGateway(p.checkoutEnabled);
            }
            if (target === 2) {
                const p = await api<{
                    plans: Plan[];
                    checkoutEnabled: boolean;
                }>('/api/billing/plans', options);
                if (current()) {
                    setPlans(p.plans);
                    setGateway(p.checkoutEnabled);
                }
            }
            if (target === 3) {
                const [o, g, u] = await Promise.all([api<{
                        orders: Row[];
                    }>('/api/admin/orders', options), api<{
                        entitlements: Row[];
                    }>('/api/admin/entitlements', options), access.isOwner?api<{users:User[]}>('/api/admin/users', options):Promise.resolve({users:[] as User[]})]);
                if (current()) {
                    setOrders(o.orders);
                    setGrants(g.entitlements);
                    setUsers(u.users);
                }
            }
            if (target === 4) {
                const c = await api<{
                    posts: Row[];
                }>('/api/admin/posts', options);
                if (current())
                    setPosts(c.posts);
            }
            if (target === 5) {
                const a = await api<{
                    events: Row[];
                }>('/api/admin/audit', options);
                if (current())
                    setEvents(a.events);
            }
        }
        finally {
            if (current())
                setDataLoading(false);
        }
    }
    useEffect(() => { const controller = new AbortController(); void load(tab, controller.signal).catch(e => { if (!controller.signal.aborted)
        setError(e.message); }); return () => { controller.abort(); readSequence.current++; }; }, [tab]);
    async function action(path: string, body: unknown, method = 'POST', onCommitted?: (result: unknown) => void) { if (mutationPending.current) return; mutationPending.current = true; setBusy(true); setError(''); setNotice(''); let committed = false; try {
        const result = await api(path, { method, body, timeoutMs: 20000 });
        committed = true;
        onCommitted?.(result);
        setNotice('Đã lưu thay đổi và ghi nhật ký.');
        await load();
    }
    catch (e) {
        setError((committed ? 'Thay đổi đã lưu; chưa tải lại được dữ liệu. ' : '') + (e as Error).message);
    }
    finally {
        mutationPending.current = false;
        setBusy(false);
    } }
    function savePost() {
        if(!capabilities.includes('content.write')||(post.published&&!capabilities.includes('content.publish')))return;
        const draft = post;
        void action('/api/admin/posts', draft, 'POST', result => {
            if (!result || typeof result !== 'object' || !('id' in result)) return;
            const id = result.id;
            const version=(result as {revision?:unknown}).revision;
            if (typeof id === 'string') setPost(current => current === draft ? { ...current, id, revision: typeof version==='number'?version:current.revision } : current);
        });
    }
    function reasonAction(path: string, body: Row, method = 'PATCH') { const reason = window.prompt('Ghi lý do thao tác (bắt buộc):'); if (reason?.trim())
        void action(path, { ...body, reason }, method); }
    return <div className={`${styles.page} ${dashboardStyles.workspace}`}><header className={`${styles.hero} ${dashboardStyles.hero}`}><div className={styles.toolbar}><span className={styles.badge}>{access.isOwner ? 'CHỦ HỆ THỐNG' : 'QUẢN TRỊ VIÊN'} · THIÊN ĐỒ</span></div><button type="button" onClick={reverify}>Xác minh lại MFA trước thao tác nhạy cảm</button><h1 className="serif">Bàn điều hành</h1><p>Quản lý tài khoản, gói Pro, giao dịch, quyền sử dụng và bài viết. Quyền quản trị được kiểm tra ở server cho từng thao tác.</p></header><div className={styles.tabs}>{tabs.map((t, i) => (i===0||capabilities.includes(tabCaps[i]))&&<button key={t} aria-pressed={tab === i} disabled={busy} onClick={() => setTab(i)}>{t}</button>)}<button disabled={busy || dataLoading} onClick={() => { setBusy(true); load().catch(e => setError(e.message)).finally(() => setBusy(false)); }}>Làm mới</button></div>{error && <p role="alert" className={styles.notice}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}
 {dataLoading && <p role="status">Đang tải dữ liệu…</p>}
 {tab === 0 && <div className={consoleCss.cards}>{adminLinks.filter(l=>l.href!=='/admin'&&(!l.cap||(l.cap==='owner'?access.isOwner:capabilities.includes(l.cap)))).map(l=><Link href={l.href} key={l.href}><strong>{l.symbol} {l.label}</strong><small>Mở không gian {l.label.toLowerCase()} ↗</small></Link>)}</div>}
 {tab === 0 && capabilities.includes('overview.read') && <AdminDashboard/>}
 {tab === 0 && !dataLoading && capabilities.includes('finance.read') && <section className={styles.card}><h2>Kết nối thanh toán</h2><p>{gateway ? 'payOS đã có cấu hình server. Cần nghiệm thu giao dịch thật trước khi mở bán.' : 'payOS chưa được cấu hình. Chưa thể tạo link thanh toán.'}</p><p className={styles.muted}>Đối soát giao dịch, theo dõi hỗ trợ và quản lý gói dịch vụ tại phân hệ tài chính.</p><Link href="/admin/finance">Mở đối soát tài chính ↗</Link></section>}

 {tab === 1 && <AdminMembers/>}
 {tab === 2 && !dataLoading && <section className={styles.card}><h2>Gói Pro</h2><p>Giá và quyền được chụp lại khi tạo đơn. Sửa gói không đổi giá hay quyền của đơn đã tạo.</p>{plans.map((p, index) => <form key={p.id} className={styles.form} onSubmit={e => { e.preventDefault(); if (confirm('Lưu cấu hình gói ' + p.name + '?'))
        void action('/api/admin/plans/' + p.id, p, 'PATCH'); }}><label>Tên gói<input value={p.name} maxLength={80} disabled={!access.isOwner} onChange={e => setPlans(plans.map((r, i) => i === index ? { ...r, name: e.target.value } : r))}/></label><label>Giá VND<input type="number" min={0} max={10000000} value={p.priceVnd} disabled={!access.isOwner} onChange={e => setPlans(plans.map((r, i) => i === index ? { ...r, priceVnd: Number(e.target.value) } : r))}/></label><label>Số ngày<input type="number" min={1} max={366} value={p.days} disabled={!access.isOwner} onChange={e => setPlans(plans.map((r, i) => i === index ? { ...r, days: Number(e.target.value) } : r))}/></label>{['premium-report', 'multi-chart-report'].map(f => <label key={f}><input type="checkbox" checked={p.features.includes(f)} disabled={!access.isOwner} onChange={e => setPlans(plans.map((r, i) => i === index ? { ...r, features: e.target.checked ? [...r.features, f] : r.features.filter(x => x !== f) } : r))}/>{f === 'premium-report' ? 'Báo cáo nghiên cứu cá nhân' : 'Báo cáo đối chiếu nhiều lá số'}</label>)}<label><input type="checkbox" checked={p.enabled} disabled={!access.isOwner} onChange={e => setPlans(plans.map((r, i) => i === index ? { ...r, enabled: e.target.checked } : r))}/>Mở bán gói</label><button disabled={busy || dataLoading || !access.isOwner}>Lưu gói</button></form>)}</section>}
 {tab === 3 && !dataLoading && <><section className={styles.card}><h2>Đơn hàng</h2><p className={styles.muted}>Trạng thái thanh toán chỉ do payOS đã xác minh cập nhật. Cấp hỗ trợ không đánh dấu một đơn là đã trả tiền.</p><div className={styles.table}><table><thead><tr><th>Tài khoản / đơn</th><th>Gói</th><th>Giá</th><th>Trạng thái</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td>{o.email}<br /><small>{o.id}</small></td><td>{o.planName}</td><td>{money(o.amountVnd)}</td><td>{stateNames[o.status] || o.status}{access.isOwner && o.status === 'paid' && <Link href="/admin/finance">Quy trình hoàn tiền 2 Admin ↗</Link>}</td></tr>)}</tbody></table></div></section><section className={styles.card} style={{ marginTop: 18 }}><h2>Quyền Pro và hỗ trợ</h2>{access.isOwner && <form className={styles.form} onSubmit={e => { e.preventDefault(); if (confirm('Cấp quyền hỗ trợ cho tài khoản đã chọn?'))
        void action('/api/admin/entitlements', grant); }}><label>Tài khoản<select required value={grant.userId} onChange={e => setGrant({ ...grant, userId: e.target.value })}><option value="">Chọn tài khoản</option>{users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}</select></label><label>Số ngày<input type="number" min={1} max={366} value={grant.days} onChange={e => setGrant({ ...grant, days: Number(e.target.value) })}/></label><label>Lý do hỗ trợ<input required maxLength={500} value={grant.reason} onChange={e => setGrant({ ...grant, reason: e.target.value })}/></label><button disabled={busy || dataLoading}>Cấp quyền hỗ trợ</button></form>}<div className={styles.table}><table><thead><tr><th>Tài khoản</th><th>Thời hạn</th><th>Nguồn</th><th>Trạng thái</th></tr></thead><tbody>{grants.map(g => <tr key={g.id}><td>{g.email}</td><td>{new Date(g.startsAt).toLocaleString('vi-VN')} → {new Date(g.expiresAt).toLocaleString('vi-VN')}</td><td>{g.orderId ? 'Thanh toán' : 'Hỗ trợ'}</td><td>{g.revokedAt ? 'Đã thu hồi' : access.isOwner ? <button disabled={busy || dataLoading} onClick={() => reasonAction('/api/admin/entitlements/' + g.id + '/revoke', {})}>Thu hồi quyền</button> : 'Có hiệu lực theo thời hạn'}</td></tr>)}</tbody></table></div></section></>}
 {tab === 4 && !dataLoading && <section className={styles.card}><h2>Bài viết / bản nháp</h2><Link href="/admin/articles">Mở trình biên tập, thùng rác & lịch sử phiên bản ↗</Link><p>Bài xuất bản xuất hiện tại <Link href="/articles">Thiên Đồ Tạp Chí</Link>. Nội dung được hiển thị dưới dạng văn bản; không chạy HTML hay script.</p><div className={styles.actions}><button disabled={busy || dataLoading || !capabilities.includes('content.write')} onClick={() => setPost({ slug: '', title: '', body: '', published: false, revision:0 })}>Bài mới</button>{posts.map(p => <button key={p.id} onClick={() => setPost({ id: p.id, slug: p.slug, title: p.title, body: p.body, published: p.published, revision:p.revision })}>{p.title} · {p.published ? 'Đã đăng' : 'Nháp'}</button>)}</div><form className={styles.form} onSubmit={e => { e.preventDefault(); savePost(); }}><label>Đường dẫn (không dấu)<input disabled={busy || dataLoading || !capabilities.includes('content.write') || (post.published&&!capabilities.includes('content.publish'))} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} value={post.slug} onChange={e => setPost({ ...post, slug: e.target.value })}/></label><label>Tiêu đề<input disabled={busy || dataLoading || !capabilities.includes('content.write') || (post.published&&!capabilities.includes('content.publish'))} required maxLength={150} value={post.title} onChange={e => setPost({ ...post, title: e.target.value })}/></label><label>Nội dung<textarea disabled={busy || dataLoading || !capabilities.includes('content.write') || (post.published&&!capabilities.includes('content.publish'))} required rows={12} maxLength={20000} value={post.body} onChange={e => setPost({ ...post, body: e.target.value })}/></label><label><input disabled={busy || dataLoading || !capabilities.includes('content.write') || !capabilities.includes('content.publish')} type="checkbox" checked={post.published} onChange={e => setPost({ ...post, published: e.target.checked })}/>Xuất bản công khai</label><button disabled={busy || dataLoading || !capabilities.includes('content.write') || (post.published&&!capabilities.includes('content.publish'))}>Lưu bài viết</button></form></section>}
 {tab === 6 && <AdminConsultations owner={access.isOwner}/>}
 {tab === 5 && !dataLoading && <section className={styles.card}><h2>Nhật ký quản trị</h2><Link href="/admin/audit">Mở nhật ký có tìm kiếm & phân trang ↗</Link><div className={styles.table}><table><thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Thao tác</th><th>Chi tiết</th></tr></thead><tbody>{events.map(a => <tr key={a.id}><td>{new Date(a.createdAt).toLocaleString('vi-VN')}</td><td>{a.actor || 'Server / payOS'}</td><td>{a.action}<br /><small>{a.target}</small></td><td>{JSON.stringify(a.details)}</td></tr>)}</tbody></table></div></section>}
 </div>;
}
