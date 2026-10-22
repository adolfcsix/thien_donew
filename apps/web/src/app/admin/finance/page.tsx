'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {usePendingOperation} from '@/lib/use-pending-operation';
import {financeSnapshot,financeMutation,type Finance,type Bank,type Quota} from '@/features/membership/finance-contract';
import { api } from '@/lib/api';
import { formatVnd as currency, paymentStateNames as states } from '@/features/membership/billing-presentation';
import { useAdminSession } from '@/features/membership/admin-session';
import styles from '@/features/membership/membership.module.css';
export default function FinanceAdmin() {
    const { access, mfa, reverify } = useAdminSession();
    const operation=usePendingOperation(),busy=operation.pending;
    const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
    const [filter,setFilter]=useState({query:'',status:''});
    const [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [data, setData] = useState<Finance | null>(null), [status, setStatus] = useState(''), [query, setQuery] = useState('');
    const [bank, setBank] = useState<Bank>({ enabled: false, bankBin: '', accountNumber: '', accountName: '', instructions: '' });
    const [quota, setQuota] = useState<Quota>({ freeDaily: 5, proDaily: 20 });
    const pendingRead=useRef<AbortController|null>(null);
    const refresh=useCallback(async()=>{
        pendingRead.current?.abort();
        const controller=new AbortController();pendingRead.current=controller;setLoading(true);setLoadError('');
        const options={signal:controller.signal,timeoutMs:15000};
        try{
            const params=new URLSearchParams({status:filter.status,q:filter.query,limit:'50',offset:'0'});
            const [finance,bankResult,quotaResult]=await Promise.all([
                api<Finance>('/api/admin/finance?'+params,options),
                api<{config:Bank}>('/api/admin/finance/bank',options),
                api<{quotas:Quota}>('/api/admin/finance/ai-quotas',options),
            ]);
            if(controller.signal.aborted)return;
            const snapshot=financeSnapshot(finance,bankResult,quotaResult);setData(snapshot.finance);setBank(snapshot.bank);setQuota(snapshot.quota);return true;
        }catch(reason){if(!controller.signal.aborted)setLoadError((reason as Error).message);return false;}finally{if(!controller.signal.aborted)setLoading(false);}
    },[filter]);
    useEffect(()=>{
        if(access.isAdmin&&mfa.verified)void refresh().catch(reason=>setError((reason as Error).message));
        return()=>pendingRead.current?.abort();
    },[access.isAdmin,mfa.verified,refresh]);
    async function mutate(path: string, body: unknown, method: 'POST' | 'PATCH' = 'POST') { if(loading||loadError)return;if(!mfa.stepUp){setError('Xác minh lại MFA trước thao tác tài chính.');return;}const controller=operation.begin();if(!controller)return;setError(''); setNotice(''); let completed = false; try {
        const receipt=await api(path, { method, body, timeoutMs: 30000,signal:controller.signal });
        if(controller.signal.aborted)return;financeMutation(path,receipt,body);
        completed = true;
        setNotice('Đã xử lý thao tác và ghi nhật ký.');
        if(!await refresh()&&!controller.signal.aborted)setNotice('Thao tác đã ghi nhận; chưa tải lại được bảng. Hãy tải lại để kiểm tra.');
    }
    catch (e) {
        if(!controller.signal.aborted)setError((completed ? 'Thao tác đã ghi nhận nhưng không tải lại được bảng. ' : '') + (e as Error).message);
    }
    finally {
        operation.finish(controller);
    } }
    const doAction = (id: string, kind: 'request' | 'approve' | 'reject' | 'complete' | 'reconcile') => {
        if(operation.isPending()||loading||loadError)return;
        if(!mfa.stepUp){setError('Xác minh lại MFA trước thao tác tài chính.');return;}
        if (kind === 'request') {
            const reason = window.prompt('Lý do yêu cầu hoàn tiền (tối thiểu 10 ký tự):');
            if (reason?.trim())
                void mutate('/api/admin/finance/orders/' + id + '/refund-request', { reason });
        }
        else if (kind === 'approve' || kind === 'reject') {
            if (window.confirm((kind === 'approve' ? 'Phê duyệt' : 'Từ chối') + ' đề nghị hoàn tiền? Đây chỉ là phê duyệt, CHƯA chuyển tiền.'))
                void mutate('/api/admin/finance/orders/' + id + '/refund-approval', { approve: kind === 'approve' });
        }
        else if (kind === 'complete') {
            const reference = window.prompt('Nhập mã giao dịch hoàn tiền ĐÃ thực hiện ngoài hệ thống:');
            if (reference && window.confirm('Xác nhận số tiền đã được hoàn thực tế trên ngân hàng/PayOS? Hệ thống KHÔNG tự chuyển tiền.'))
                void mutate('/api/admin/finance/orders/' + id + '/refund-complete', { reference, confirmedExternally: true });
        }
        else if (window.confirm('Đối soát đơn này trực tiếp với payOS?'))
            void mutate('/api/admin/finance/orders/' + id + '/reconcile', {});
    };
    return <main className={styles.page}><header className={styles.hero}><span className={styles.badge}>THIÊN ĐỒ · ADMIN FINANCE</span><h1 className="serif">Thanh toán &amp; Đối soát</h1><p>Số liệu chỉ tổng hợp trạng thái đơn từ hệ thống. Không thay sao kê ngân hàng hoặc quyết toán thuế.</p><Link href="/admin">← Bàn điều hành</Link>{access.isOwner&&(!mfa.stepUp||/MFA/.test(error))&&<button type="button" disabled={busy} onClick={reverify}>Xác minh lại MFA</button>}</header>
 {loading&&<span className="visually-hidden" role="status">Đang tải dữ liệu tài chính…</span>}{loadError&&<div role="alert"><p>{loadError}</p><button type="button" disabled={busy||loading} onClick={()=>{setError('');setNotice('');void refresh();}}>Tải lại dữ liệu tài chính</button></div>}
 {error && <p role="alert" className={styles.notice}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}
 <div className={styles.grid} aria-busy={loading}>{([
            ['Đơn đã thanh toán', data?.summary.paidOrders || 0],
            ['Tổng đơn', data?.summary.ordersTotal || 0],
            ['Doanh thu ghi nhận', currency(data?.summary.netVnd || 0)],
            ['Đã ghi hoàn tiền', currency(data?.summary.refundedVnd || 0)]
        ] as const).map(([label, value]) => <section className={styles.card} key={label}><h2>{label}</h2><div className={styles.price}>{loading||loadError||!data?'—':value}</div></section>)}</div>
 <section className={styles.card} style={{ marginTop: 20 }}><h2>Đơn hàng và đối soát PayOS</h2><p>Chỉ dữ liệu do PayOS xác minh mới tạo quyền Pro. QR chuyển khoản thủ công không tạo quyền tự động.</p><form className={styles.row} onSubmit={e => { e.preventDefault(); if(operation.isPending())return;setError('');setNotice('');if(filter.query===query&&filter.status===status)void refresh();else setFilter({query,status}); }}><label>Trạng thái <select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(states).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label><label>Email hoặc mã đơn<input maxLength={100} value={query} onChange={e => setQuery(e.target.value)}/></label><button disabled={busy||loading||!!loadError}>Lọc</button></form>
 <div className={styles.table}><table><thead><tr><th>Đơn / email</th><th>Gói</th><th>Giá</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{(!loading&&!loadError?data?.orders:undefined)?.map(o => <tr key={o.id}><td>{o.email}<br /><small>{o.id}</small></td><td>{o.planName}</td><td>{currency(o.amountVnd)}</td><td>{states[o.status] || o.status}</td><td>{access.isOwner && <div className={styles.actions}><button disabled={busy||loading||!!loadError||!data?.payOSConfigured} onClick={() => doAction(o.id, 'reconcile')}>Đối soát</button>{o.status === 'paid' && <button disabled={busy||loading||!!loadError} onClick={() => doAction(o.id, 'request')}>Đề nghị hoàn tiền</button>}</div>}</td></tr>)}</tbody></table></div>{!loading&&!loadError&&data&&!data.orders.length && <p>Chưa có đơn trong bộ lọc.</p>}
 </section>
 <section className={styles.card} style={{ marginTop: 20 }}><h2>Hồ sơ hoàn tiền — kiểm soát hai Admin</h2><p>Người yêu cầu không thể tự phê duyệt. Người hoàn tất phải đối chiếu chứng từ hoàn tiền tại ngân hàng/PayOS ngoài hệ thống.</p><div className={styles.table}><table><thead><tr><th>Đơn / khách hàng</th><th>Lý do</th><th>Trạng thái</th><th>Xử lý</th></tr></thead><tbody>{(!loading&&!loadError?data?.refunds:undefined)?.map(r => <tr key={r.orderId}><td>{r.email}<br /><small>{r.orderId}</small><br /><small>Đề nghị: {r.requestedBy || '—'}</small></td><td>{r.reason}</td><td>{r.status}</td><td>{access.isOwner && <div className={styles.actions}>{r.status === 'requested' && <><button disabled={busy||loading||!!loadError} onClick={() => doAction(r.orderId, 'approve')}>Duyệt</button><button disabled={busy||loading||!!loadError} onClick={() => doAction(r.orderId, 'reject')}>Từ chối</button></>}{r.status === 'approved' && <button disabled={busy||loading||!!loadError} onClick={() => doAction(r.orderId, 'complete')}>Ghi hoàn tiền đã thực hiện</button>}</div>}</td></tr>)}</tbody></table></div></section>
 <section className={styles.card} style={{ marginTop: 20 }}><h2>Cấu hình ngân hàng — QR tham khảo</h2><p>Mã QR ngân hàng được tạo qua dịch vụ VietQR bên ngoài khi bật. <strong>Không</strong> dùng phần này để tự động xác nhận giao dịch, và không nên bật nếu chưa có quy trình đối soát thủ công.</p><form className={styles.form} onSubmit={e => { e.preventDefault();if(operation.isPending()||loading||loadError)return; if (window.confirm('Xác nhận cập nhật thông tin tài khoản nhận tiền?'))
        void mutate('/api/admin/finance/bank', bank, 'PATCH'); }}><label>Mã BIN ngân hàng<input value={bank.bankBin} disabled={!access.isOwner||busy||loading||!!loadError} maxLength={8} pattern="[0-9]{6,8}" onChange={e => setBank({ ...bank, bankBin: e.target.value })}/></label><label>Số tài khoản<input value={bank.accountNumber} disabled={!access.isOwner||busy||loading||!!loadError} maxLength={30} pattern="[0-9]{6,30}" onChange={e => setBank({ ...bank, accountNumber: e.target.value })}/></label><label>Tên người nhận<input value={bank.accountName} disabled={!access.isOwner||busy||loading||!!loadError} maxLength={100} onChange={e => setBank({ ...bank, accountName: e.target.value })}/></label><label>Hướng dẫn<textarea rows={3} value={bank.instructions} maxLength={600} disabled={!access.isOwner||busy||loading||!!loadError} onChange={e => setBank({ ...bank, instructions: e.target.value })}/></label><label><input type="checkbox" checked={bank.enabled} disabled={!access.isOwner||busy||loading||!!loadError} onChange={e => setBank({ ...bank, enabled: e.target.checked })}/> Công bố thông tin chuyển khoản tham khảo (không cấp Pro)</label>{access.isOwner && <button disabled={busy||loading||!!loadError}>Lưu cấu hình thanh toán</button>}</form></section>
 <section className={styles.card} style={{ marginTop: 20 }}><h2>Lượt AI theo gói</h2><p>Trần AI chung của Huyền Giải vẫn được áp dụng. Muốn Pro có 20 lượt/ngày, cần tăng trần cấu hình AI chung lên ít nhất 20.</p><form className={styles.form} onSubmit={e => { e.preventDefault(); void mutate('/api/admin/finance/ai-quotas', quota, 'PATCH'); }}><label>Miễn phí / ngày<input type="number" min={0} max={200} value={quota.freeDaily} disabled={!access.isOwner||busy||loading||!!loadError} onChange={e => setQuota({ ...quota, freeDaily: Number(e.target.value) })}/></label><label>Pro / ngày<input type="number" min={0} max={200} value={quota.proDaily} disabled={!access.isOwner||busy||loading||!!loadError} onChange={e => setQuota({ ...quota, proDaily: Number(e.target.value) })}/></label>{access.isOwner && <button disabled={busy||loading||!!loadError}>Lưu hạn mức</button>}</form></section>
 </main>;
}
