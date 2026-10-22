'use client';

import { useMemo, useState, type FormEvent } from 'react';
import type { ChartInput } from '@thiendo/shared-types';
import { convertBirthCalendar, birthCheck } from '../lib/birth-calendar';

type Props = {
  input: ChartInput;
  onChange: <K extends keyof ChartInput>(field: K, value: ChartInput[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ChartForm({ input, onChange, onSubmit }: Props) {
  const [calendarError, setCalendarError] = useState('');
  const check = useMemo(() => birthCheck(input), [input.date, input.calendar, input.leap, input.hour, input.minute, input.gender]);

  function changeCalendar(next: ChartInput['calendar']) {
    if (next === input.calendar) return;
    try {
      const converted = convertBirthCalendar(input, next);
      onChange('date', converted.date);
      onChange('calendar', converted.calendar);
      onChange('leap', converted.leap);
      setCalendarError('');
    } catch {
      setCalendarError('Ngày hiện tại không hợp lệ. Hãy sửa ngày sinh rồi chuyển loại lịch; hệ thống sẽ không tự thay đổi ý nghĩa ngày sinh.');
    }
  }

  return (
    <aside className="entry-panel">
      <div className="panel-top">
        <span className="eyebrow">BƯỚC 01 / THÔNG TIN</span>
        <h2 className="serif">Thông tin lá số</h2>
      </div>
      <form onSubmit={onSubmit}>
        <label className="field">
          Tên lá số
          <input required maxLength={70} placeholder="Nhập họ và tên" value={input.label} onChange={e => onChange('label', e.target.value)} />
        </label>
        <label className="field">
          Ngày sinh
          <input
            required
            type={input.calendar === 'solar' ? 'date' : 'text'}
            placeholder="YYYY-MM-DD"
            pattern={input.calendar === 'lunar' ? '[0-9]{4}-[0-9]{2}-[0-9]{2}' : undefined}
            inputMode={input.calendar === 'lunar' ? 'numeric' : undefined}
            aria-describedby="chart-birth-input-hint"
            value={input.date}
            min={input.calendar === 'solar' ? '1900-01-01' : undefined}
            max={input.calendar === 'solar' ? '2100-12-31' : undefined}
            onChange={e => onChange('date', e.target.value)}
          />
        </label>
        <div className="field">
          <span>Loại lịch</span>
          <div className="choice-row">
            <button type="button" aria-pressed={input.calendar === 'solar'} className={input.calendar === 'solar' ? 'selected' : ''} onClick={() => changeCalendar('solar')}>Dương lịch</button>
            <button type="button" aria-pressed={input.calendar === 'lunar'} className={input.calendar === 'lunar' ? 'selected' : ''} onClick={() => changeCalendar('lunar')}>Âm lịch</button>
          </div>
        </div>
        <p className="chart-birth-input-hint" id="chart-birth-input-hint">Ngày âm: YYYY-MM-DD. Chọn tháng nhuận nếu cần.</p>
        {calendarError && <p className="chart-birth-error" role="alert">{calendarError}</p>}
        {input.calendar === 'lunar' && (
          <label className="checkline">
            <input type="checkbox" checked={input.leap} onChange={e => onChange('leap', e.target.checked)} />
            Tháng âm nhuận
          </label>
        )}
        <div className="input-pair">
          <label className="field">
            Giờ sinh
            <select value={input.hour} onChange={e => onChange('hour', Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')} giờ</option>)}
            </select>
          </label>
          <label className="field">
            Phút sinh
            <select value={input.minute} onChange={e => onChange('minute', Number(e.target.value))}>
              {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')} phút</option>)}
            </select>
          </label>
        </div>
        <div className="field">
          <span>Giới tính theo phép an sao</span>
          <div className="choice-row">
            <button type="button" aria-pressed={input.gender === 'Nam'} className={input.gender === 'Nam' ? 'selected' : ''} onClick={() => onChange('gender', 'Nam')}>Nam</button>
            <button type="button" aria-pressed={input.gender === 'Nữ'} className={input.gender === 'Nữ' ? 'selected' : ''} onClick={() => onChange('gender', 'Nữ')}>Nữ</button>
          </div>
        </div>
        <div className="chart-birth-preview" role="status" aria-live="polite">
          <strong>Đối chiếu thông tin trước khi lập</strong>
          {check.error ? <p className="chart-birth-error">{check.error}</p> : <p>Dương lịch <b>{check.solar}</b> · Âm lịch <b>{check.lunar}</b> · Giờ <b>{check.hourBranch}</b></p>}
        </div>
        <button className="btn gold full" type="submit" disabled={Boolean(check.error)}>✦ &nbsp;Tính lá số</button>
        <details className="chart-form-help">
          <summary>Hướng dẫn về lịch và giờ sinh</summary>
          <p>Chuyển loại lịch sẽ quy đổi ngày đã nhập. Giờ sinh áp dụng theo múi giờ Việt Nam (UTC+7). Nếu sinh ở nước ngoài hoặc gần 23:00, cần kiểm tra múi giờ và quy ước đổi ngày trước khi lập lá số.</p>
        </details>
      </form>
    </aside>
  );
}
