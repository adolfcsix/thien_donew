'use client';
import Link from 'next/link';
import {useAuth} from '@/components/auth-provider';
import {AccountRank} from '@/components/account-rank';
import {useConsoleData} from './shared';
import type {AdminIdentity} from './model';
import {AdminRoleBadge} from './role-badge';
/** Role identity is not earned research rank. Never infer it from a name. */
export function AccountStanding(){const {close}=useAuth();const own=useConsoleData<{identity:AdminIdentity|null}>('/api/admin/console/identity');
 if(own.loading)return <p role="status">Đang kiểm tra danh tính tài khoản…</p>;
 if(own.error)return <div role="alert"><p>{own.error}</p><button className="btn secondary" onClick={own.reload}>Tải lại danh tính</button></div>;
 if(!own.data?.identity)return <AccountRank/>;
 const identity=own.data.identity;
 return <section className="account-section" aria-label="Danh tính quản trị"><div className="account-rank-identity"><AdminRoleBadge identity={identity} size={88}/><div><h3>{identity.role==='owner'?'Chủ hệ thống Thiên Đồ':'Quản trị viên Thiên Đồ'}</h3><p>{identity.motto||'Huy hiệu quản trị · quyền do máy chủ xác nhận'}</p><Link href="/admin/profile" onClick={close}>Mở hồ sơ & tùy chỉnh huy hiệu quản trị ↗</Link></div></div><details><summary>Cấp nghiên cứu cá nhân (độc lập với vai trò quản trị)</summary><AccountRank/></details></section>;
}
