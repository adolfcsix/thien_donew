'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {usePendingOperation} from '@/lib/use-pending-operation';
import { useAuth } from '@/components/auth-provider';
import { studyApi,chartApi,birthProfileApi } from '@/lib/api';
import {navigationItems} from '@/lib/navigation';
import type {SavedChart} from '@thiendo/shared-types';
import type {BirthProfile} from '@/features/birth-profiles/types';
import {workspaceIndex,searchWorkspace} from '@/features/unified-room/workspace-index.cjs';
import type { StudyEntry, StudyDiscipline } from '@/features/study-room/study-types';
import { studyHref } from '@/features/study-room/study-links.cjs';
import { parseStudyBackup, MAX_BYTES } from '@/features/study-room/study-backup.cjs';
import { fingerprintEntries, reservePending, finishPending } from '@/features/study-room/import-retry.cjs';
import { normalizeSearchText } from '@/lib/navigation';
import { downloadBlobFile } from '@/lib/download-blob';
import {publicStudyTags} from '@/lib/public-study-text';
import styles from '@/features/study-room/study-room.module.css';

const names:Record<StudyDiscipline,string> = {'general':'Ghi chú chung','mai-hoa':'Mai Hoa','luc-hao':'Lục Hào','ky-mon':'Kỳ Môn','dai-luc-nham':'Đại Lục Nhâm','thai-at':'Thái Ất','phong-thuy':'Phong thủy','ha-lac':'Hà Lạc','thiet-ban':'Thiết Bản','lich-phap':'Lịch pháp','numerology':'Thần số học','western-astrology':'Chiêm tinh phương Tây','tarot':'Tarot RWS','bazi':'Bát Tự · Tứ Trụ'};
const disciplines = Object.keys(names) as StudyDiscipline[];
export default function StudyPage() {
  const { user, loading, open } = useAuth();
  return <div className={styles.panel}>
    <header className={styles.hero}><span className={styles.eyebrow}>THIÊN ĐỒ · THƯ PHÒNG CÁ NHÂN</span><h1>Thư phòng thống nhất</h1><p>Một điểm tìm kiếm cho hồ sơ sinh, lá số, bản nghiên cứu và công cụ. Dữ liệu thuộc từng bộ môn vẫn giữ riêng quy tắc và phép tính.</p><p><Link href="/birth-profiles" className={styles.link}>Hồ sơ sinh ↗</Link> · <Link href="/study/compare" className={styles.link}>So sánh nghiên cứu ↗</Link> · <Link href="/collection" className={styles.link}>Bộ sưu tập Tử Vi ↗</Link></p></header>
    {loading?<p role="status">Đang xác minh phiên đăng nhập…</p>:!user?<div className={styles.panel}><p>Đăng nhập để sử dụng Thư phòng. Chưa đăng nhập thì dữ liệu không được gửi lên máy chủ.</p><button className={styles.primary} onClick={() => open()}>Đăng nhập / đăng ký</button></div>:<StudyForUser key={user.id} userId={user.id}/>}
  </div>;
}
function StudyForUser({userId}:{userId:string}){
  const [entries,setEntries]=useState<StudyEntry[]>([]);
  const [profiles,setProfiles]=useState<BirthProfile[]>([]);
  const [charts,setCharts]=useState<SavedChart[]>([]);
  const [catalogError,setCatalogError]=useState(''),[catalogBusy,setCatalogBusy]=useState(true);
  const catalogRequest=useRef<AbortController|null>(null);
  const [profileFilter,setProfileFilter]=useState('all');
  const [birthProfileId,setBirthProfileId]=useState('');
  const [newProfileId,setNewProfileId]=useState('');
  const [busy,setBusy]=useState(true);
  const {pending:working,begin:beginOperation,finish:finishOperation}=usePendingOperation();
  const [error,setError]=useState(''),[listError,setListError]=useState('');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [editing,setEditing]=useState<string|null>(null);
  const [title,setTitle]=useState('');
  const [notes,setNotes]=useState('');
  const [tags,setTags]=useState('');
  const [newTitle,setNewTitle]=useState('');
  const [newNotes,setNewNotes]=useState('');
  const [newTags,setNewTags]=useState('');
  const [backupEntries,setBackupEntries]=useState<ReturnType<typeof parseStudyBackup>|null>(null);
  const [backupImportId,setBackupImportId]=useState<string|null>(null);
  const [backupFingerprint,setBackupFingerprint]=useState<string|null>(null);
  const selectionSeq=useRef(0);
  const request=useRef<AbortController|null>(null);
  const exportRequest=useRef<AbortController|null>(null);
  const backupFile=useRef<HTMLInputElement|null>(null);
  const mounted=useRef(true);
  const refresh=useCallback(async()=>{
    request.current?.abort();
    const controller=new AbortController();request.current=controller;setBusy(true);setListError('');
    try{const data=await studyApi.list(controller.signal);
      if(!controller.signal.aborted){setEntries(data.entries);setError('');return true;}
      return false;
    }catch(e){if(!controller.signal.aborted)setListError((e as Error).message);return false;}
    finally{if(!controller.signal.aborted)setBusy(false);if(request.current===controller)request.current=null;}
  },[userId]);
  useEffect(()=>{mounted.current=true;void refresh();return()=>{mounted.current=false;request.current?.abort();exportRequest.current?.abort();};},[refresh]);
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('profile');if(id&&/^[0-9a-f-]{36}$/i.test(id))setProfileFilter(id);},[]);
  const refreshCatalog=useCallback(async()=>{
    catalogRequest.current?.abort();const controller=new AbortController();catalogRequest.current=controller;setCatalogBusy(true);setCatalogError('');
    try{
      const [p,c]=await Promise.allSettled([birthProfileApi.list(controller.signal),chartApi.list(controller.signal)]);
      if(controller.signal.aborted)return;
      if(p.status==='fulfilled')setProfiles(p.value.profiles);
      if(c.status==='fulfilled')setCharts(c.value.charts);
      if(p.status==='rejected'||c.status==='rejected')setCatalogError('Chưa tải đủ hồ sơ sinh hoặc lá số để tìm kiếm. Hãy tải lại dữ liệu liên quan.');
    }finally{if(!controller.signal.aborted)setCatalogBusy(false);if(catalogRequest.current===controller)catalogRequest.current=null;}
  },[userId]);
  useEffect(()=>{void refreshCatalog();return()=>catalogRequest.current?.abort();},[refreshCatalog]);
  const workspace=useMemo(()=>workspaceIndex({profiles,charts,entries,navigation:navigationItems}),[profiles,charts,entries]);
  const matches=useMemo(()=>searchWorkspace(workspace,search,{limit:100}),[workspace,search]);
  const otherMatches=matches.filter(x=>x.kind!=='study');
  const filtered=useMemo(()=>{
    const q=normalizeSearchText(search);
    return entries.filter(x=>(filter==='all'||x.discipline===filter)&&(profileFilter==='all'||(profileFilter==='none'?!x.birthProfileId:x.birthProfileId===profileFilter))&&(!q||matches.some(m=>m.kind==='study'&&m.id===x.id)));
  },[entries,filter,search,profileFilter,matches]);
  async function mutate(action:()=>Promise<unknown>,message:string){
    const controller=beginOperation();if(!controller)return false;setError('');
    try{await action();if(mounted.current&&!controller.signal.aborted){const refreshed=await refresh();if(mounted.current&&!controller.signal.aborted)setError(refreshed?message:`${message} Danh sách chưa đồng bộ. Hãy làm mới trước khi thao tác tiếp.`);}return true;}
    catch(e){if(mounted.current&&!controller.signal.aborted)setError((e as Error).message);return false;}
    finally{finishOperation(controller);}
  }
  async function saveNew(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const name=newTitle.trim();if(!name)return;
    const ok=await mutate(()=>studyApi.create({discipline:'general',title:name,summary:'Ghi chú nghiên cứu độc lập',notes:newNotes,tags:parseTags(newTags),snapshot:{},...(newProfileId?{birthProfileId:newProfileId}:{})}),'Đã tạo ghi chú.');
    if(ok&&mounted.current){setNewTitle('');setNewNotes('');setNewTags('');setNewProfileId('');}
  }
  function startEdit(entry:StudyEntry){setEditing(entry.id);setTitle(entry.title);setNotes(entry.notes);setTags(entry.tags.join(', '));setBirthProfileId(entry.birthProfileId??'');}
  async function saveEdit(id:string){
    const ok=await mutate(()=>studyApi.update(id,{title,notes,tags:parseTags(tags),birthProfileId:birthProfileId||null}),'Đã cập nhật hồ sơ.');
    if(ok&&mounted.current)setEditing(null);
  }
  /** One read-only archive with all three private collections; restore remains per module. */
  function exportUnified(){
    if(busy||working)return;
    const controller=beginOperation();if(!controller)return;exportRequest.current?.abort();exportRequest.current=controller;
    void (async()=>{try{
      const [p,c,e]=await Promise.all([birthProfileApi.list(controller.signal),chartApi.list(controller.signal),studyApi.list(controller.signal)]);
      if(controller.signal.aborted)return;
      const payload={format:'thien-do.unified-workspace',version:1,exportedAt:new Date().toISOString(),birthProfiles:p.profiles,charts:c.charts,studyEntries:e.entries};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      downloadBlobFile(blob,`thien-do-toan-bo-thu-phong-${new Date().toISOString().slice(0,10)}.json`);
      setError('Đã xuất tệp lưu trữ tổng hợp. Tệp chứa dữ liệu cá nhân, không phải định dạng khôi phục tự động; hãy cất giữ bảo mật.');
    }catch(err){if(!controller.signal.aborted)setError((err as Error).message);}finally{if(exportRequest.current===controller)exportRequest.current=null;finishOperation(controller);}})();
  }
  function exportData(){
    if(busy||working)return;
    const controller=beginOperation();if(!controller)return;exportRequest.current?.abort();exportRequest.current=controller;
    void (async()=>{try{
      const data=await studyApi.list(controller.signal);if(controller.signal.aborted)return;
      const blob=new Blob([JSON.stringify({format:'thien-do.study-export',version:1,exportedAt:new Date().toISOString(),entries:data.entries},null,2)],{type:'application/json'});
      downloadBlobFile(blob,`thien-do-thu-phong-${new Date().toISOString().slice(0,10)}.json`);
      setError('Đã xuất bản sao Thư phòng. Tệp chứa ghi chú và tham số nghiên cứu riêng tư; hãy bảo quản an toàn.');
    }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{if(exportRequest.current===controller)exportRequest.current=null;finishOperation(controller);}})();
  }
  async function selectBackup(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.currentTarget.files?.[0];event.currentTarget.value='';
    const selected=++selectionSeq.current;
    setBackupEntries(null);setBackupImportId(null);setBackupFingerprint(null);setError('');
    if(!file)return;
    if(file.size>MAX_BYTES){setError('Tệp JSON vượt giới hạn 2 MB.');return;}
    try{
      const parsed=parseStudyBackup(await file.text());
      if(!parsed.length)throw Error('Bản sao không chứa hồ sơ để khôi phục.');
      const fingerprint=await fingerprintEntries(parsed,crypto);
      if(!mounted.current||selected!==selectionSeq.current)return;
      // A reload after a lost COMMIT response must reuse the original ID.
      // sessionStorage is scoped to the current tab and account. It never
      // contains the backup data, notes, titles or snapshots.
      let reservation:{importId:string;resumed:boolean};
      let persistent=true;
      try { reservation=reservePending(window.sessionStorage,userId,fingerprint,()=>crypto.randomUUID()); }
      catch { reservation={importId:crypto.randomUUID(),resumed:false};persistent=false; }
      setBackupEntries(parsed);setBackupImportId(reservation.importId);setBackupFingerprint(fingerprint);
      setError(!persistent
        ? `Đã kiểm tra ${parsed.length} hồ sơ, nhưng trình duyệt chặn bộ nhớ phiên: tránh tải lại trang giữa lúc khôi phục để không mất mã yêu cầu.`
        : reservation.resumed
          ? `Tệp có lần nhập chưa xác nhận. Hãy bấm Khôi phục để kiểm tra lại cùng mã yêu cầu, không tạo thêm dữ liệu trùng.`
          : `Đã kiểm tra tệp: ${parsed.length} hồ sơ hợp lệ. Chỉ hoàn tất khi toàn bộ hồ sơ ghi thành công; không ghi đè dữ liệu hiện có.`);
    }catch(e){if(mounted.current&&selected===selectionSeq.current)setError((e as Error).message);}
  }
  async function restoreBackup(){
    if(!backupEntries?.length||!backupImportId||!backupFingerprint||working||busy)return;
    const controller=beginOperation();if(!controller)return;
    if(!window.confirm(`Tạo ${backupEntries.length} hồ sơ mới từ bản sao? Hồ sơ hiện có sẽ được giữ nguyên.`)){finishOperation(controller);return;}
    setError('');
    const restoring=backupEntries;
    try {
      const result=await studyApi.importBackup(restoring,backupImportId);
      if(mounted.current){
        try { finishPending(window.sessionStorage,userId,backupImportId); } catch { /* no private contents stored */ }
        setBackupEntries(null);setBackupImportId(null);setBackupFingerprint(null);
        const refreshed=await refresh();
        if(mounted.current)setError(`${result.replayed?'Đã xác nhận lần nhập trước':'Đã khôi phục trọn vẹn'} ${result.imported} hồ sơ, bao gồm trạng thái ghim.${refreshed?'':' Danh sách chưa đồng bộ. Hãy làm mới để xem dữ liệu đã lưu.'}`);
      }
    }catch(e){
      if(mounted.current){
        // A dropped POST response may hide a successful COMMIT.
        // Query durable server receipt; if still unknown, the same importId
        // is retained, making another click safe even if the POST is in flight.
        let committed: number | null = null;
        try { const status=await studyApi.importStatus(backupImportId);committed=status.committed&&status.imported===restoring.length?status.imported:null; }
        catch { /* missing receipt or offline: retry SAME importId, never a new one */ }
        const refreshed=await refresh();
        if(mounted.current){
          if(committed!==null){
            try { finishPending(window.sessionStorage,userId,backupImportId); } catch { /* storage may be disabled */ }
            setBackupEntries(null);setBackupImportId(null);setBackupFingerprint(null);setError(`Máy chủ xác nhận đã nhập thành công ${committed} hồ sơ. Không nhập lặp.${refreshed?'':' Danh sách chưa đồng bộ; hãy làm mới để xem.'}`);}
          else setError(`Chưa xác nhận kết quả: ${(e as Error).message}. Có thể bấm Khôi phục lại cùng tệp; máy chủ sẽ không nhập trùng trong lần yêu cầu này.`);
        }
      }
    }finally{finishOperation(controller);}
  }
  return <>
    <div className={styles.panel}><div className={styles.stats}><span><b>{entries.length}/200</b> bản nghiên cứu</span><span><b>{profiles.length}/100</b> hồ sơ sinh</span><span><b>{charts.length}/100</b> lá số Tử Vi</span><span><b>{entries.filter(x=>x.pinned).length}</b> đã ghim</span><span><Link className={styles.link} href="/collection">Bộ sưu tập lá số Tử Vi ↗</Link></span></div>
      <div className={styles.actions} style={{marginTop:14}}><button className={styles.secondary} disabled={busy||working} onClick={()=>{void refresh();void refreshCatalog();}}>Làm mới</button><button className={styles.secondary} disabled={busy||working} onClick={exportUnified}>↓ Xuất dữ liệu tổng hợp</button><button className={styles.secondary} disabled={busy||working||!entries.length} onClick={exportData}>↓ Xuất riêng nghiên cứu</button><button type="button" className={styles.secondary} disabled={busy||working} onClick={()=>backupFile.current?.click()}>↑ Chọn bản sao JSON</button><input ref={backupFile} type="file" accept="application/json,.json" disabled={busy||working} onChange={event=>void selectBackup(event)} hidden />{backupEntries&&<button className={styles.primary} disabled={busy||working||!backupEntries.length} onClick={()=>void restoreBackup()}>Khôi phục {backupEntries.length} hồ sơ</button>}</div>
    </div>
    <section className={styles.panel} aria-label="Tạo ghi chú nghiên cứu"><h2>Tạo ghi chú mới</h2><form className={styles.newForm} onSubmit={event=>void saveNew(event)}>
      <label className={styles.field}><span>Tiêu đề (tối đa 100 ký tự)</span><input disabled={working} required maxLength={100} value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Ví dụ: đối chiếu sách và trường phái"/></label>
      <label className={styles.field}><span>Nội dung (tối đa 3.000 ký tự)</span><textarea disabled={working} rows={4} maxLength={3000} value={newNotes} onChange={e=>setNewNotes(e.target.value)} placeholder="Quan sát, phương pháp, điều kiện chưa rõ…"/></label>
      <label className={styles.field}><span>Nhãn, ngăn cách bằng dấu phẩy (tối đa 5)</span><input disabled={working} value={newTags} onChange={e=>setNewTags(e.target.value)} placeholder="nguồn, kiểm chứng"/></label>
      {!!profiles.length&&<label className={styles.field}><span>Hồ sơ sinh liên quan (tùy chọn)</span><select value={newProfileId} disabled={working} onChange={e=>setNewProfileId(e.target.value)}><option value="">Không liên kết</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <div><button className={styles.primary} disabled={working||busy} type="submit">Lưu ghi chú</button></div>
    </form></section>
    <div className={styles.toolbar}>
      <label className={styles.field}><span>Tìm kiếm toàn Thiên Đồ (hồ sơ sinh, lá số, nghiên cứu, công cụ)</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nhập tên, ngày sinh, môn học, nhãn hoặc công cụ…" /></label>
      <label className={styles.field}><span>Bộ môn</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả</option>{disciplines.map(d=><option key={d} value={d}>{names[d]}</option>)}</select></label>
      <label className={styles.field}><span>Liên kết hồ sơ sinh</span><select value={profileFilter} onChange={e=>setProfileFilter(e.target.value)}><option value="all">Tất cả</option><option value="none">Chưa liên kết</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <div className={styles.stats} style={{alignSelf:'end'}} role="status">Hiển thị <b>{filtered.length}</b> bản nghiên cứu</div>
    </div>
    {catalogError&&<div role="alert" className={styles.status}><p>{catalogError}</p><button disabled={catalogBusy||working} onClick={()=>void refreshCatalog()}>Tải lại hồ sơ và lá số</button></div>}
    {search.trim()&&<section className={styles.panel} aria-label="Tìm kiếm trên hồ sơ sinh, lá số và công cụ"><h2>Kết quả ở các khu vực khác ({otherMatches.length})</h2>{!otherMatches.length?<p className={styles.muted}>Không tìm thấy hồ sơ sinh, lá số hay công cụ phù hợp.</p>:<div className={styles.cards}>{otherMatches.map(x=><article className={styles.card} key={`${x.kind}:${x.id}`}><span className={styles.eyebrow}>{({profile:'Hồ sơ sinh',chart:'Lá số Tử Vi',tool:'Công cụ',study:'Nghiên cứu'} as const)[x.kind]}</span><h2>{x.title}</h2><p className={styles.muted}>{x.subtitle}</p><Link href={x.href}>Mở mục này ↗</Link></article>)}</div>}</section>}
    {error&&<p className={styles.status} role="status">{error}</p>}
    {busy?<p role="status">Đang tải dữ liệu…</p>:listError?<p role="alert">{listError}</p>:!filtered.length?<p role="status">Không có hồ sơ phù hợp. Hãy thử một bộ môn hoặc thêm ghi chú mới.</p>:<div className={styles.cards}>
      {filtered.map(entry=><article className={styles.card} id={`entry-${entry.id}`} key={entry.id}>
        <div className={styles.stats}><span className={styles.eyebrow}>{names[entry.discipline]}</span>{entry.pinned&&<span aria-label="Đã ghim">★ Đã ghim</span>}</div>
        <h2>{entry.title}</h2><p>{entry.summary}</p>
        <p className={styles.muted}>Cập nhật {formatDate(entry.updatedAt)}</p>{entry.birthProfileId&&<p className={styles.muted}>Hồ sơ sinh liên quan: {profiles.find(p=>p.id===entry.birthProfileId)?.name||'Không còn khả dụng'}</p>}
        {!!entry.tags.length&&<div>{publicStudyTags(entry.tags).map(tag=><span className={styles.tag} key={tag}>{tag}</span>)}</div>}
        {editing===entry.id?<div className={styles.edit}>
          <label className={styles.field}><span>Tiêu đề</span><input disabled={working} maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} /></label>
          <label className={styles.field}><span>Ghi chú</span><textarea disabled={working} rows={5} maxLength={3000} value={notes} onChange={e=>setNotes(e.target.value)} /></label>
          <label className={styles.field}><span>Nhãn</span><input disabled={working} value={tags} onChange={e=>setTags(e.target.value)} /></label>
          {!!profiles.length&&<label className={styles.field}><span>Liên kết hồ sơ sinh</span><select value={birthProfileId} disabled={working} onChange={e=>setBirthProfileId(e.target.value)}><option value="">Không liên kết</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
          <div className={styles.actions}><button disabled={working||!title.trim()} onClick={()=>void saveEdit(entry.id)}>Lưu thay đổi</button><button disabled={working} onClick={()=>setEditing(null)}>Hủy</button></div>
        </div>:<>{entry.notes&&<p style={{whiteSpace:'pre-wrap'}}>{entry.notes.slice(0,400)}{entry.notes.length>400?'…':''}</p>}
          <div className={styles.actions}>
            {entry.discipline!=='general'&&<Link href={entry.discipline==='dai-luc-nham'&&entry.snapshot.method==='da-liu-ren-nine-gates-yuanshushan-research-v1'?`/dai-luc-nham?entry=${encodeURIComponent(entry.id)}`:entry.discipline==='thai-at'&&entry.snapshot.methodId==='taiyi-jinjing-annual-724'?`/thai-at?entry=${encodeURIComponent(entry.id)}`:entry.discipline==='ky-mon'&&entry.snapshot.method==='qimen-nine-palace-evidence-v1'?`/ky-mon/depth?entry=${encodeURIComponent(entry.id)}`:(['numerology','western-astrology','tarot','bazi'].includes(entry.discipline)||entry.discipline==='mai-hoa'&&entry.snapshot.method==='mai-hoa-evidence-v1'||entry.discipline==='luc-hao'&&entry.snapshot.method==='luc-hao-jingfang-evidence-v1')?`/${entry.discipline}${entry.discipline==='western-astrology'&&entry.snapshot.method==='western-relationship-midpoint-v1'?'/relationship':''}?entry=${encodeURIComponent(entry.id)}`:studyHref(entry.discipline,entry.snapshot)}>↗ Mở lại tham số</Link>}
            <Link href={`/study/compare?ids=${encodeURIComponent(entry.id)}`}>⇄ So sánh</Link><button disabled={working} onClick={()=>startEdit(entry)}>Ghi chú / đổi tên / liên kết</button>
            <button disabled={working} aria-label={`${entry.pinned?'Bỏ ghim':'Ghim'} ${entry.title}`} onClick={()=>void mutate(()=>studyApi.update(entry.id,{pinned:!entry.pinned}),entry.pinned?'Đã bỏ ghim.':'Đã ghim.')}>{entry.pinned?'Bỏ ghim':'Ghim'}</button>
            <button disabled={working} onClick={()=>{if(window.confirm(`Xóa vĩnh viễn hồ sơ “${entry.title}”?`))void mutate(()=>studyApi.remove(entry.id),'Đã xóa hồ sơ.');}}>Xóa</button>
          </div></>}
      </article>)}
    </div>}
    <p className={styles.muted}>Dữ liệu lưu theo tài khoản PostgreSQL; không tự đồng bộ với thiết bị khác nếu chưa đăng nhập. Lịch sử là các lần bạn chủ động lưu, không ghi âm thầm mọi lượt xem. Tệp JSON chỉ chứa bản nghiên cứu, không bao gồm hồ sơ sinh, và bản khôi phục không tự gắn liên kết hồ sơ sinh; máy chủ ghi cả lô và biên nhận trong một giao dịch hoặc rollback khi thất bại. Mỗi lần nhập có mã yêu cầu riêng; sau khi tải lại cùng tab, chọn lại đúng tệp chưa xác nhận sẽ sử dụng lại mã cũ để tránh tạo dữ liệu trùng. Trình duyệt chỉ giữ mã và dấu vân tay tệp trong bộ nhớ phiên, không giữ nội dung sao lưu. Biên nhận PostgreSQL mới là bằng chứng xác nhận. Hồ sơ cũ không bị ghi đè, giới hạn 200 hồ sơ vẫn áp dụng.</p>
  </>;
}
function parseTags(text:string):string[]{return text.split(',').map(x=>x.trim()).filter(Boolean);}
function formatDate(raw:string):string{const date=new Date(raw);return Number.isNaN(date.getTime())?'—':date.toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'});}
