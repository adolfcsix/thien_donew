'use client';

import { useMemo, useState, type FormEvent } from 'react';
import type { ChartInput } from '@thiendo/shared-types';
import { convertBirthCalendar, birthCheck, LEAP_PLACEMENT_NOTE, lunarMonthChoices, normalizeLunarBirthDate } from '../lib/birth-calendar';
import { BirthTimeResearch } from './birth-time-research';

type Props = {
  input: ChartInput;
  profileLoading?: boolean;
  onChange: <K extends keyof ChartInput>(field: K, value: ChartInput[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ChartForm({ input, profileLoading = false, onChange, onSubmit }: Props) {
  const [failedCalendarSwitch, setFailedCalendarSwitch] = useState<string | null>(null);
  const calendarKey = `${input.calendar}/${input.date}/${input.leap}`;
  const check = useMemo(() => birthCheck(input), [input.date, input.calendar, input.leap, input.hour, input.minute, input.gender]);
  const monthChoices = useMemo(
    () => input.calendar === 'lunar' ? lunarMonthChoices(input.date) : null,
    [input.calendar, input.date],
  );

  function changeCalendar(next: ChartInput['calendar']) {
    if (next === input.calendar) return;
    try {
      const converted = convertBirthCalendar(input, next);
      onChange('date', converted.date);
      onChange('calendar', converted.calendar);
      onChange('leap', converted.leap);
      setFailedCalendarSwitch(null);
    } catch {
      setFailedCalendarSwitch(calendarKey);
    }
  }

  function changeLeap(leap: boolean) {
    setFailedCalendarSwitch(null);
    onChange('leap', leap);
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
            onChange={e => {
              setFailedCalendarSwitch(null);
              const date = e.target.value;
              onChange('date', input.calendar === 'lunar' ? normalizeLunarBirthDate(date) : date);
            }}
          />
        </label>
        <div className="field">
          <span>Loại lịch</span>
          <div className="choice-row">
            <button type="button" aria-pressed={input.calendar === 'solar'} className={input.calendar === 'solar' ? 'selected' : ''} onClick={() => changeCalendar('solar')}>Dương lịch</button>
            <button type="button" aria-pressed={input.calendar === 'lunar'} className={input.calendar === 'lunar' ? 'selected' : ''} onClick={() => changeCalendar('lunar')}>Âm lịch</button>
          </div>
        </div>
        <p className="chart-birth-input-hint" id="chart-birth-input-hint">
          {input.calendar === 'lunar' ? 'Nhập 8 chữ số theo thứ tự năm, tháng, ngày. Ví dụ 20170630.' : 'Chuyển sang âm lịch để xem ngày âm tương ứng.'}
        </p>
        {failedCalendarSwitch === calendarKey && <p className="chart-birth-error chart-birth-input-hint" role="alert">Sửa ngày sinh hoặc chọn tháng hợp lệ rồi chuyển loại lịch.</p>}
        {monthChoices?.hasLeapMonth ? (
          <fieldset className="chart-lunar-month">
            <legend>Chọn tháng âm</legend>
            <div className="chart-lunar-month-options">
              {[
                { leap: false, label: 'Tháng thường', solar: monthChoices.regularSolar },
                { leap: true, label: 'Tháng nhuận', solar: monthChoices.leapSolar },
              ].map(option => (
                <label key={option.label} className="chart-lunar-month-option">
                  <input type="radio" name="tuvi-lunar-month" checked={input.leap === option.leap}
                    disabled={!option.solar} onChange={() => changeLeap(option.leap)} />
                  <span>{option.label}<small>{option.solar ? `${option.solar} dương lịch` : 'Ngày này không hợp lệ'}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : input.leap && monthChoices?.regularSolar && (
          <div className="chart-lunar-month">
            <p>Ngày này chỉ có trong tháng thường ({monthChoices.regularSolar} dương lịch).</p>
            <button type="button" className="btn" onClick={() => changeLeap(false)}>Dùng tháng thường</button>
          </div>
        )}
        <div className="input-pair">
          <label className="field">
            Giờ sinh
            <select id="tuvi-birth-hour" aria-label="Giờ sinh" value={input.hour} onChange={e => onChange('hour', Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')} giờ</option>)}
            </select>
          </label>
          <label className="field">
            Phút sinh
            <select id="tuvi-birth-minute" aria-label="Phút sinh" value={input.minute} onChange={e => onChange('minute', Number(e.target.value))}>
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
          {check.leap && <small>{LEAP_PLACEMENT_NOTE}</small>}
        </div>
        {profileLoading && <p className="chart-birth-input-hint" role="status">Đang tải hồ sơ sinh…</p>}
        <button className="btn gold full" type="submit" disabled={profileLoading || Boolean(check.error)}>✦ &nbsp;Tính lá số</button>
        <BirthTimeResearch input={input} />
        <details className="chart-form-help">
          <summary>Hướng dẫn về lịch và giờ sinh</summary>
          <p>Chuyển loại lịch sẽ quy đổi ngày đã nhập. Giờ sinh áp dụng theo múi giờ Việt Nam (UTC+7). Nếu sinh ở nước ngoài hoặc gần 23:00, cần kiểm tra múi giờ và quy ước đổi ngày trước khi lập lá số.</p>
        </details>
      </form>
    </aside>
  );
}
