'use client';

import { useEffect, useId, useRef } from 'react';
import { TinhCanhMedal } from '@/components/tinh-canh-medal';
import { medalDesign } from './medal-designs';
import css from './medal-inspector.module.css';
export function MedalInspector({
  level,
  onChoose,
  onClose
}: {
  level: number | null;
  onChoose: (level: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useId();
  useEffect(() => {
    const node = dialog.current;
    if (level !== null && !node?.open) node?.showModal();
    if (level === null && node?.open) node.close();
    if (node?.open && (!node.contains(document.activeElement) || document.activeElement?.matches(':disabled'))) {
      node.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    }
  }, [level]);
  const design = level === null ? null : medalDesign(level);
  return <dialog ref={dialog} className={css.dialog} aria-labelledby={heading} onClose={onClose} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }}>
    {design && <>
      <header className={css.header}>
        <div>
          <small>THẬP BÁT TINH CẢNH · CẢNH {design.level}</small>
          <h2 id={heading}>
            {design.name}
          </h2>
        </div>
        <button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Đóng khung xem huy hiệu">Đóng ×</button>
      </header>
      <div className={css.stage} data-display-tier={design.tier}>
        <TinhCanhMedal level={design.level} size={260} />
      </div>
      <p className={css.caption}>{design.stageName} · Mốc tích lũy {design.points.toLocaleString('vi-VN')} Tinh Văn</p>
      <h3>
        {design.shortName}
      </h3>
      <p>
        {design.description}
      </p>
      <p className={css.caption}>{design.motion}. Khi bật Giảm chuyển động, tất cả lớp sẽ hiển thị tĩnh.</p>
      <p className={css.caption}>Đây là bản trưng bày. Xem huy hiệu không cấp cảnh giới hoặc cộng điểm.</p>
      <nav className={css.navigation} aria-label="Chuyển huy hiệu">
        <button type="button" disabled={design.level === 1} onClick={() => onChoose(design.level - 1)}>← Cấp trước</button>
        <span>{design.level}/18</span>
        <button type="button" disabled={design.level === 18} onClick={() => onChoose(design.level + 1)}>Cấp tiếp →</button>
      </nav>
    </>}
  </dialog>;
}
