'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {usePendingOperation} from '@/lib/use-pending-operation';
import { chartApi } from '@/lib/api';
import {downloadBlobFile} from '@/lib/download-blob';
import { useAuth } from '@/components/auth-provider';
import dynamic from 'next/dynamic';
const ChartBoard=dynamic(()=>import('@/components/chart-board').then(module=>module.ChartBoard),{loading:()=> <p role="status">Đang dựng địa bàn 12 cung…</p>});
import type { SavedChart, AstrologyResult, ChartBackupV1 } from '@thiendo/shared-types';

/** Session identity is a component boundary: switching accounts unmounts the previous private view. */
export default function CollectionPage() {
  const { user, loading, open } = useAuth();
  if (loading) return <CollectionFrame><p className="muted">Đang xác minh phiên đăng nhập…</p></CollectionFrame>;
  if (!user) return <CollectionFrame><div className="empty-state">Bạn chưa đăng nhập. <button className="btn gold small" onClick={() => open()}>Đăng nhập</button></div></CollectionFrame>;
  return <CollectionForUser key={user.id} userId={user.id} />;
}
function CollectionFrame({ children }: { children: React.ReactNode }) {
  return <><div className="page-heading"><div className="eyebrow">THƯ PHÒNG · KHÔNG GIAN CÁ NHÂN</div><h1 className="serif">Bộ sưu tập lá số</h1><p>Dữ liệu chỉ hiển thị trong phiên của tài khoản đang đăng nhập.</p></div><div className="collection-panel">{children}</div></>;
}
function CollectionForUser({ userId }: { userId: string }) {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [selected, setSelected] = useState<AstrologyResult | null>(null);
  const [message, setMessage] = useState('');
  const [error,setError]=useState(''),[loadError,setLoadError]=useState('');
  const [detailLoading,setDetailLoading]=useState(false),[selectedLabel,setSelectedLabel]=useState('');
  const operation=usePendingOperation();
  const [busy, setBusy] = useState(true);
  // Cancel stale reads so a delayed response cannot overwrite the current selection.
  const listRequest = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const exportRequest = useRef<AbortController | null>(null);
  const importRequest = useRef<AbortController | null>(null);
  const importInput = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const refresh = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setBusy(true);setLoadError('');
    try {
      const data = await chartApi.list(controller.signal);
      if (!controller.signal.aborted) { setCharts(data.charts); setMessage(''); return true; }
      return false;
    } catch (error) {
      if (!controller.signal.aborted) setLoadError((error as Error).message);
      return false;
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      if (listRequest.current === controller) listRequest.current = null;
    }
  }, [userId]);
  useEffect(() => {
    void refresh();
    return () => { listRequest.current?.abort(); detailRequest.current?.abort(); exportRequest.current?.abort(); importRequest.current?.abort(); };
  }, [refresh]);
  async function view(id: string) {
    if(operation.isPending())return;
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setSelected(null);setDetailLoading(true);
    setMessage('');setError('');
    try {
      const data = await chartApi.get(id, controller.signal);
      if (!controller.signal.aborted) {
        setSelected(data.result);setSelectedLabel(data.chart.label);
        setMessage(data.outdated ? 'Lá số được tính lại bằng bộ quy tắc hiện tại.' : '');
      }
    } catch (error) {
      if (!controller.signal.aborted) setError((error as Error).message);
    } finally { if (detailRequest.current === controller) {detailRequest.current = null;if(!controller.signal.aborted)setDetailLoading(false);} }
  }
  async function exportAll() {
    if (busy) return;
    const controller = operation.begin();if(!controller)return;
    setMessage('');setError('');
    exportRequest.current?.abort();
    exportRequest.current = controller;
    try {
      // Fetch a fresh, owner-scoped snapshot. Never reuse a possibly stale list.
      const data = await chartApi.list(controller.signal);
      if (controller.signal.aborted) return;
      const payload = {
        format: 'thien-do.saved-charts', version: 1,
        exportedAt: new Date().toISOString(), charts: data.charts,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      downloadBlobFile(blob, `thien-do-la-so-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage(`Đã tạo bản sao lưu ${data.charts.length} lá số. Hãy bảo quản tệp vì có thông tin ngày giờ sinh.`);
    } catch (error) { if (!controller.signal.aborted) setError((error as Error).message); }
    finally { if (exportRequest.current === controller) exportRequest.current = null;operation.finish(controller); }
  }
  async function restoreFromFile(file: File | undefined) {
    if (!file || busy) return;
    const controller=operation.begin();if(!controller)return;
    setMessage('');setError('');
    // Create the cancellation token before asynchronous file reading: account
    // switching/unmounting must prevent a late backup from being uploaded.
    importRequest.current?.abort();
    importRequest.current = controller;
    setImporting(true);
    if (importInput.current) importInput.current.value = '';
    if (file.size > 65536) { setError('Tệp JSON lớn hơn 64 KB; không thể khôi phục.'); importRequest.current = null;setImporting(false);operation.finish(controller); return; }
    setMessage('');setError('');
    try {
      const payload: unknown = JSON.parse(await file.text());
      if (controller.signal.aborted) return;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw Error('Nội dung không phải bản sao lưu THIÊN ĐỒ.');
      const backup = payload as ChartBackupV1;
      if (backup.format !== 'thien-do.saved-charts' || backup.version !== 1 ||
          !Array.isArray(backup.charts) || backup.charts.length === 0 || backup.charts.length > 100)
        throw Error('Chỉ hỗ trợ bản sao lưu THIÊN ĐỒ V1 có 1–100 lá số.');
      if (!window.confirm(`Nhập ${backup.charts.length} lá số vào tài khoản hiện tại?\n\nHệ thống sẽ kiểm tra ngày sinh, bỏ qua bản trùng, không ghi đè dữ liệu cũ. Tệp chứa thông tin cá nhân.`)) return;
      if (controller.signal.aborted) return;
      setImporting(true);
      const result = await chartApi.importBackup(backup, controller.signal);
      if (controller.signal.aborted) return;
      const refreshed = await refresh();
      if (!controller.signal.aborted) setMessage(`Khôi phục thành công: thêm ${result.imported}, bỏ qua ${result.skipped} bản trùng. Tổng ${result.total}/100 lá số.${refreshed?'':' Danh sách chưa đồng bộ; hãy làm mới để xem dữ liệu đã lưu.'}`);
    } catch (error) {
      if (!controller.signal.aborted && (error as Error).name !== 'AbortError') setError(`Không thể khôi phục: ${(error as Error).message}`);
    } finally {
      if (!controller.signal.aborted) setImporting(false);
      if (importRequest.current === controller) importRequest.current = null;
      operation.finish(controller);
    }
  }
  async function remove(id: string) {
    const controller=operation.begin();if(!controller)return;
    if (!window.confirm('Xóa lá số này khỏi tài khoản?')) {operation.finish(controller);return;}
    detailRequest.current?.abort();setDetailLoading(false);setSelected(null);setError('');setMessage('');
    try {
      await chartApi.remove(id,controller.signal);
      if(controller.signal.aborted)return;
      const refreshed=await refresh();
      if(!controller.signal.aborted)setMessage('Đã xóa lá số.'+(refreshed?'':' Danh sách chưa đồng bộ; hãy làm mới để kiểm tra.'));
    } catch (reason) {if(!controller.signal.aborted)setError((reason as Error).message);}
    finally {operation.finish(controller);}
  }
  return <CollectionFrame><div className="section-head"><h2 className="serif">Danh sách đã lưu</h2><div className="saved-actions"><button className="btn secondary small" onClick={() => void exportAll()} disabled={busy || operation.pending || charts.length === 0} title="Tải thông tin các lá số đã lưu dạng JSON">↓ Sao lưu JSON</button><input ref={importInput} type="file" accept="application/json,.json" className="visually-hidden" style={{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none'}} tabIndex={-1} aria-label="Chọn bản sao lưu THIÊN ĐỒ" onChange={event=>void restoreFromFile(event.currentTarget.files?.[0])}/><button className="btn secondary small" onClick={()=>importInput.current?.click()} disabled={busy || operation.pending} title="Khôi phục lá số từ tệp JSON do THIÊN ĐỒ xuất">{importing?'Đang khôi phục…':'↑ Khôi phục JSON'}</button><button className="btn secondary small" onClick={() => void refresh()} disabled={busy || operation.pending}>↻ Làm mới</button></div></div>{busy ? <p className="muted" role="status">Đang tải dữ liệu…</p> : loadError ? <p role="alert">{loadError}</p> : charts.length === 0 ? <div className="empty-state">Chưa có lá số. Vào phòng lập lá số để tạo và lưu. <Link href="/chart">Lập và lưu lá số ↗</Link></div> : <div className="saved-list">{charts.map(chart => <div className="saved-item" key={chart.id}><div><b>{chart.label}</b><p>{chart.date} · {String(chart.hour).padStart(2, '0')}:{String(chart.minute).padStart(2, '0')} · {chart.calendar === 'solar' ? 'Dương' : 'Âm'} lịch</p></div><div className="saved-actions"><button className="btn secondary small" disabled={operation.pending} onClick={() => void view(chart.id)}>Mở</button><button className="btn subtle small" disabled={operation.pending} onClick={() => void remove(chart.id)}>Xóa</button></div></div>)}</div>}{error&&<p role="alert" className="status-message">{error}</p>}{detailLoading&&<p role="status">Đang mở lá số…</p>}{message && <p className="status-message" role="status">{message}</p>}{selected && <div className="collection-panel"><ChartBoard key={[selected.solar.year,selected.solar.month,selected.solar.day,selected.hour,selected.minute,selected.gender,selected.ruleSet].join("-")} result={selected} label={selectedLabel}/></div>}</CollectionFrame>;
}
