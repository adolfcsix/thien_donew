'use client';
import { useEffect, useRef, useState } from 'react';
import {usePendingOperation} from '@/lib/use-pending-operation';
import { useAuth } from '@/components/auth-provider';
import { studyApi, birthProfileApi } from '@/lib/api';
import type {BirthProfile} from '@/features/birth-profiles/types';
import type { StudyDraft } from './study-types';
import styles from './study-room.module.css';

/** Explicit save only: never track page visits or silently send personal notes. */
export function SaveStudy({ draft, disabled = false,onSaved }: { draft:StudyDraft|null; disabled?:boolean;onSaved?:()=>void }) {
  const { user, open } = useAuth();
  const operation=usePendingOperation(),saving=operation.pending;
  const [message,setMessage] = useState('');
  const owner = useRef<string|null>(null);
  owner.current = user?.id ?? null;
  const [profiles,setProfiles]=useState<BirthProfile[]>([]);
  const [profileId,setProfileId]=useState(''),[profileError,setProfileError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    setProfiles([]);setProfileId('');setProfileError('');if(!user)return;
    const controller=new AbortController();
    void birthProfileApi.list(controller.signal).then(data=>{if(!controller.signal.aborted)setProfiles(data.profiles);}).catch(()=>{if(!controller.signal.aborted)setProfileError('Chưa tải được hồ sơ sinh. Bạn có thể tải lại hoặc lưu nghiên cứu không liên kết hồ sơ.');});
    return()=>controller.abort();
  },[user?.id,retry]);
  async function save() {
    if (!draft || disabled || saving) return;
    if (!user) { open(); return; }
    const controller=operation.begin();if(!controller)return;
    if (!window.confirm(`Lưu “${draft.title}” và các tham số đầu vào trong tài khoản? Ghi chú có thể bổ sung tại Thư phòng cá nhân.`)){operation.finish(controller);return;}
    setMessage('');
    const requestedOwner = user.id;
    try {
      await studyApi.create({...draft,...(profileId?{birthProfileId:profileId}:{})},controller.signal);
      if (owner.current===requestedOwner&&!controller.signal.aborted){setMessage('Đã lưu vào Thư phòng cá nhân.');onSaved?.();}
    } catch (error) {
      if (owner.current===requestedOwner&&!controller.signal.aborted) setMessage((error as Error).message+' Hãy kiểm tra Thư phòng trước khi lưu lại; yêu cầu trên máy chủ có thể đã hoàn tất.');
    } finally { operation.finish(controller); }
  }
  return <div className={styles.saveBar}>{profileError&&<div role="alert"><p>{profileError}</p><button type="button" disabled={saving} onClick={()=>setRetry(value=>value+1)}>Tải lại hồ sơ liên kết</button></div>}{user&&profiles.length>0&&<label className={styles.field}><span>Liên kết hồ sơ sinh (tùy chọn)</span><select value={profileId} disabled={saving} onChange={e=>setProfileId(e.target.value)}><option value="">Không liên kết</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}<button type="button" disabled={disabled||!draft||saving} className={styles.primary} onClick={()=>void save()}>{saving?'Đang lưu…':'✧ Lưu hồ sơ nghiên cứu'}</button><a href="/study">Mở Thư phòng cá nhân ↗</a>{message&&<span role="status">{message}</span>}</div>;
}
