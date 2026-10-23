'use client';

import {useEffect, useId, useRef, useState, type CSSProperties} from 'react';
import {observeVisibleMotion} from '@/lib/visible-motion';
import {observatoryLessons, type ObservatoryDiscipline} from './observatory-lessons';
import css from './symbol-observatory.module.css';

/** Educational model, independent of calculation and saved chart state. */
export function SymbolObservatory({discipline}: {discipline: ObservatoryDiscipline}) {
  const lessons = observatoryLessons[discipline];
  const [step, setStep] = useState(0);
  const [angle, setAngle] = useState(0);
  const [separated, setSeparated] = useState(true);
  const [running, setRunning] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const id = useId();
  const lesson = lessons.steps[step];
  useEffect(() => scene.current ? observeVisibleMotion(scene.current) : undefined, []);
  useEffect(() => { setStep(0); setAngle(0); setRunning(false); }, [discipline]);
  function reset() { setStep(0); setAngle(0); setSeparated(true); setRunning(false); }

  return <section className={css.root} aria-labelledby={id} data-observatory={discipline}>
    <header><span>THIÊN ĐỒ / XƯỞNG HỌC BIỂU TƯỢNG</span><h2 id={id}>{lessons.title}</h2>
      <p>Mô hình 3D minh họa cách đọc, không phải kết quả tính hay dữ liệu cá nhân. Chọn một lớp để xem cách đối chiếu.</p>
    </header>
    <div className={css.layout}>
      <div className={css.instrument}>
        <div ref={scene} className={css.viewport} aria-hidden="true" data-paused="true"
          data-running={running} data-separated={separated} data-step={step}
          style={{'--view-angle': `${angle}deg`} as CSSProperties}>
          <div className={css.rig}><div className={css.rotor}>
            <div className={css.base}/><div className={css.axis}/>
            {lessons.steps.map((item, i) => <div className={css.layer} key={item.label}
              data-selected={i === step} style={{'--level': i, '--phase': `${i * 30}deg`} as CSSProperties}>
              <div className={css.ring}>{Array.from({length:12}, (_, n) => <i key={n} style={{'--tick': `${n * 30}deg`} as CSSProperties}/>)}</div>
              <div className={css.tile}><b>{item.glyph}</b><span>{i + 1}</span></div>
            </div>)}
          </div></div>
        </div>
        <div className={css.viewControls}>
          <label htmlFor={id+'-angle'}>Góc nhìn mô hình: {angle}°</label>
          <input id={id+'-angle'} type="range" min={-45} max={45} step={5} value={angle}
            onChange={event => {setAngle(Number(event.target.value)); setRunning(false);}}/>
          <div className={css.buttons}>
            <button type="button" aria-pressed={separated} onClick={() => setSeparated(v => !v)}>Tách các lớp</button>
            <button type="button" aria-pressed={running} onClick={() => setRunning(v => !v)}>Tự xoay mô hình</button>
            <button type="button" onClick={reset}>Đặt lại góc nhìn</button>
          </div>
          <small>Chế độ giảm hiệu ứng hoặc giảm chuyển động của thiết bị luôn được ưu tiên. Có thể xoay bằng thanh góc nhìn khi mô hình đứng yên.</small>
        </div>
      </div>
      <div className={css.study}>
        <div className={css.steps} role="group" aria-label="Chọn lớp học biểu tượng">
          {lessons.steps.map((item, i) => <button type="button" key={item.label}
            aria-pressed={i === step} aria-controls={id+'-lesson'} onClick={() => setStep(i)}>{i+1}. {item.label}</button>)}
        </div>
        <article id={id+'-lesson'} aria-live="polite" aria-atomic="true">
          <h3>{lesson.label}</h3><p>{lesson.read}</p>
          <h4>Đối chiếu trước khi kết luận</h4><p>{lesson.check}</p>
          <h4>Dễ đọc sai</h4><p>{lesson.pitfall}</p>
          <h4>Thực hành</h4><p>{lesson.practice}</p>
        </article>
        <p className={css.notice}>{lessons.scope}</p>
      </div>
    </div>
  </section>;
}
