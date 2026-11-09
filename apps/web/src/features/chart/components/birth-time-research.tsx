'use client';

import {useMemo, useState} from 'react';
import type {ChartInput} from '@thiendo/shared-types';
import {assess} from '@thiendo/astrology-engine/src/solar-time-research.cjs';
import {convertBirthCalendar} from '../lib/birth-calendar';

/** Optional study only. Never changes the submitted birth data or production chart. */
export function BirthTimeResearch({input}:{input:ChartInput}) {
  const [longitude, setLongitude] = useState('');
  const [utcOffsetHours, setUtcOffsetHours] = useState('7');
  const analysis = useMemo(() => {
    if (!longitude.trim()) return null;
    try {
      const date = input.calendar === 'solar' ? input.date : convertBirthCalendar(input, 'solar').date;
      const hours = Number(utcOffsetHours);
      if (!utcOffsetHours.trim() || !Number.isFinite(hours) || Math.round(hours * 60) !== hours * 60)
        throw new RangeError('Độ lệch UTC phải có độ chính xác theo phút.');
      return {result: assess({date, hour:input.hour, minute:input.minute,
        longitude:Number(longitude), utcOffsetMinutes:hours * 60}), error:''};
    } catch (error) {
      return {result:null, error:error instanceof Error ? error.message : 'Dữ liệu khảo sát chưa hợp lệ.'};
    }
  }, [input.calendar, input.date, input.hour, input.minute, input.leap, longitude, utcOffsetHours]);
  const showClock = (time:{date:string;hour:number;minute:number;second?:number;branch:string}) =>
    `${time.date} · ${String(time.hour).padStart(2,'0')}:${String(time.minute).padStart(2,'0')}${time.second === undefined ? '' : ':' + String(time.second).padStart(2,'0')} · giờ ${time.branch}`;

  return (
    <details className="chart-form-help">
      <summary>Khảo sát giờ mặt trời (tùy chọn · chuyên sâu)</summary>
      <p>Đối chiếu giờ sinh theo kinh độ và phương trình thời gian. Kết quả chỉ phục vụ nghiên cứu, không tự đổi dữ liệu lập lá số.</p>
      <div className="input-pair">
        <label className="field">
          Kinh độ nơi sinh (°)
          <input type="number" value={longitude} min={-180} max={180} step="any" inputMode="decimal"
            placeholder="Ví dụ: 105.85" onChange={event=>setLongitude(event.target.value)}/>
        </label>
        <label className="field">
          Lệch UTC tiêu chuẩn (giờ)
          <input type="number" value={utcOffsetHours} min={-12} max={14} step="any" inputMode="decimal"
            onChange={event=>setUtcOffsetHours(event.target.value)}/>
        </label>
      </div>
      <p>Nhập múi giờ chuẩn tại nơi sinh, không tự cộng/trừ giờ mùa hè. Nếu lịch sử múi giờ có thay đổi, cần đối chiếu tài liệu trước.</p>
      {analysis?.error && <p className="chart-birth-error" role="alert">{analysis.error}</p>}
      {analysis?.result && (
        <div className="chart-birth-preview" role="status" aria-live="polite">
          <strong>Kết quả khảo sát (không áp dụng tự động)</strong>
          <p>Giờ đồng hồ: <b>{showClock(analysis.result.clock)}</b></p>
          <p>Giờ mặt trời ước tính: <b>{showClock(analysis.result.corrected)}</b></p>
          <p>Hiệu chỉnh kinh độ {analysis.result.longitudeCorrectionMinutes.toFixed(1)} phút · phương trình thời gian {analysis.result.equationOfTimeMinutes.toFixed(1)} phút.</p>
          {analysis.result.branchChanged && <p><strong>Khác chi giờ:</strong> cần kiểm tra giờ sinh và quy tắc lập lá số trước khi sử dụng kết quả.</p>}
          {analysis.result.nearBranchBoundary && <p><strong>Gần ranh giới giờ:</strong> sai số giờ sinh nhỏ có thể làm đổi chi giờ.</p>}
          <p>Phương pháp gần đúng NOAA; không phải phép xác minh giờ lịch sử hoặc kết luận Tử Vi.</p>
        </div>
      )}
    </details>
  );
}

