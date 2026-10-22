'use client';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import {TuViCanvas} from '@/features/discipline-canvas/discipline-canvas';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {usePendingOperation} from '@/lib/use-pending-operation';
import { useAuth } from '@/components/auth-provider';
import { ChartForm } from '@/features/chart/components/chart-form';
import { ChartResult } from '@/features/chart/components/chart-result';
import { calculateLocal } from '@/lib/engine';
import { chartApi, birthProfileApi } from '@/lib/api';
import type { ChartInput, AstrologyResult } from '@thiendo/shared-types';

const initial: ChartInput = {
  label: '',
  date: '2004-01-01',
  hour: 8,
  minute: 30,
  calendar: 'solar',
  leap: false,
  gender: 'Nam',
};

export default function ChartPage() {
  const [input, setInput] = useState<ChartInput>(initial);
  const [calculated, setCalculated] = useState<ChartInput | null>(null);
  const [result, setResult] = useState<AstrologyResult | null>(null);
  useEffect(() => {
    if (!result) return;
    const frame = requestAnimationFrame(() => document.getElementById('tuvi-chart-result')?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
    return () => cancelAnimationFrame(frame);
  }, [result]);
  const [message, setMessage] = useState('');
  const operation=usePendingOperation(),saving=operation.pending;
  const [sourceProfileId,setSourceProfileId]=useState<string|null>(null);
  const { user, open } = useAuth();
  const ownerRef = useRef<string | null>(null);
  const formVersion = useRef(0);
  ownerRef.current = user?.id || null;
  // Explicit profile reuse; never derive a missing birth hour or silently convert calendars.
  useEffect(()=>{
    const profileId=new URLSearchParams(window.location.search).get('profile');
    if(!profileId)return;
    setInput(initial);setSourceProfileId(null);setResult(null);setCalculated(null);
    if(!user)return;
    const controller=new AbortController();const revision=formVersion.current;
    void birthProfileApi.get(profileId,controller.signal).then(({profile:p})=>{
      if(controller.signal.aborted||revision!==formVersion.current)return;
      if(p.hour===null||p.minute===null||!p.gender)throw Error('Tử Vi cần giờ, phút và quy ước Nam/Nữ. Hãy bổ sung vào hồ sơ sinh.');
      if(p.timeZone!=='Asia/Ho_Chi_Minh')throw Error('Bộ lập Tử Vi hiện dùng giờ Việt Nam. Cần đối chiếu múi giờ trước khi nhập hồ sơ này.');
      setInput({label:p.name,date:p.date,hour:p.hour,minute:p.minute,calendar:p.calendar,leap:p.leap,gender:p.gender});
      setSourceProfileId(p.id);
      setResult(null);setCalculated(null);setMessage('Đã nạp đầu vào hồ sơ sinh. Hãy kiểm tra và bấm Lập lá số; dữ liệu chưa được lưu thêm.');
    }).catch(e=>{if(!controller.signal.aborted)setMessage((e as Error).message);});
    return()=>controller.abort();
  },[user?.id]);

  function update<K extends keyof ChartInput>(field: K, value: ChartInput[K]) {
    formVersion.current += 1;
    setInput(current => ({ ...current, [field]: value }));
    setSourceProfileId(null);
    setResult(null);
    setCalculated(null);
    setMessage('');
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    try {
      const snapshot = { ...input };
      setResult(calculateLocal(snapshot));
      setCalculated(snapshot);
    } catch (error) {
      setResult(null);
      setCalculated(null);
      setMessage((error as Error).message);
    }
  }

  async function save() {
    if (!result || !calculated || saving) return;
    if (!user) { open(); return; }
    const controller=operation.begin();if(!controller)return;
    if (!window.confirm('Lưu tên, ngày giờ sinh và giới tính vào tài khoản trên máy chủ?')) {operation.finish(controller);return;}
    setMessage('');
    const requestedOwner = user.id;
    const requestedVersion = formVersion.current;
    try {
      if(sourceProfileId)await chartApi.save({...calculated,birthProfileId:sourceProfileId},controller.signal);
      else await chartApi.save(calculated);
      if (!controller.signal.aborted && ownerRef.current === requestedOwner && formVersion.current === requestedVersion)
        setMessage('Đã lưu lá số vào tài khoản. Mở mục Lá số của tôi để xem lại.');
    } catch (error) {
      if (!controller.signal.aborted && ownerRef.current === requestedOwner && formVersion.current === requestedVersion)
        setMessage((error as Error).message+' Hãy kiểm tra Bộ sưu tập trước khi lưu lại; yêu cầu trên máy chủ có thể đã hoàn tất.');
    } finally {
      operation.finish(controller);
    }
  }

  async function exportImage(year: number) {
    if (!result) return;
    const { downloadChartPng } = await import('@/features/chart/lib/download-image');
    await downloadChartPng(result, calculated?.label || input.label, year);
  }

  function exportData() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = 'thien-do-la-so.json';
    document.body.appendChild(element);
    element.click();
    element.remove();
    // Defer revocation until the browser has had a chance to consume the click.
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <>
      <div className="page-heading"><EasternScene variant="tu-vi"/>
        <div className="eyebrow">KHÁM PHÁ · TỬ VI ĐẨU SỐ</div>
        <h1 className="serif">Phòng lập lá số</h1>
        <p>Nhập ngày giờ sinh để lập địa bàn Tử Vi. Lá số chỉ được lưu khi bạn chọn lưu.</p>
      </div>
      <div id="tuvi-workspace" className="workspace chart-atlas-workspace">
        <details className="chart-input-drawer" open={!result}><summary>{result ? "Thông tin sinh · chỉnh sửa và lập lại lá số" : "Thông tin lập lá số"}</summary><ChartForm input={input} onChange={update} onSubmit={create} /></details>
        <ChartResult
          key={result ? [result.solar.year, result.solar.month, result.solar.day, result.hour, result.minute, result.gender, formVersion.current].join('-') : 'empty'}
          result={result}
          label={calculated?.label ?? input.label}
          saving={saving}
          message={message}
          onSave={() => void save()}
          onExport={exportData}
          onExportImage={exportImage}
        />
      </div>
      {!result && <details className="chart-method-details"><summary>Khám phá cấu trúc 12 cung trước khi lập lá số</summary><TuViCanvas ready={false}/></details>}
    </>
  );
}
