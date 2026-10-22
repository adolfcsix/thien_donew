'use client';

import { useEffect, useRef, useState } from 'react';
import type { AstrologyHouse, AnnualOverview } from '@thiendo/shared-types';
import { adjacentPalaceBranch } from '../lib/chart-explorer';
import { PalaceDetails } from './palace-details';

type ReaderProps = {
  house: AstrologyHouse;
  houses: readonly AstrologyHouse[];
  annual: AnnualOverview;
  ruleSet: string;
  showAnnual: boolean;
  showStrength: boolean;
  skin: 'heritage' | 'jade';
  onSelect: (branchIndex: number) => void;
  onClose: () => void;
};

/**
 * Native modal dialog preserves keyboard focus and Escape handling without
 * a duplicate chart tree. The data is the same engine result as the board.
 * In particular, it does not recompute star positions or infer interpretations.
 */
export function PalaceReaderDialog({house,houses,annual,ruleSet,showAnnual,showStrength,skin,onSelect,onClose}:ReaderProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [largeText,setLargeText] = useState(false);

  useEffect(() => {
    const modal = modalRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!modal) return;
    modal.showModal();
    closeRef.current?.focus();
    return () => {
      if (modal.open) modal.close();
      previousFocus?.focus();
    };
  }, []);

  function move(direction: 'previous' | 'next') {
    const branch = adjacentPalaceBranch(houses, house.branchIndex, direction);
    if (branch !== null) onSelect(branch);
  }

  return <dialog
    ref={modalRef}
    className="palace-reader-dialog"
    data-reader-skin={skin}
    data-reader-font={largeText ? 'large' : 'normal'}
    aria-modal="true"
    aria-labelledby="thiendo-palace-reader-title"
    aria-describedby="thiendo-palace-reader-description"
    onClose={() => {
      // In React Strict Mode the effect is mounted/cleaned up twice in dev.
      // Ignore a queued close event from that cleanup if the dialog reopened.
      if (!modalRef.current?.open) onClose();
    }}
  >
    <div className="palace-reader-header">
      <div>
        <span className="palace-reader-eyebrow">THIÊN ĐỒ · PHÒNG ĐỌC THẬP NHỊ CUNG</span>
        <h2 id="thiendo-palace-reader-title">Cung {house.palace} <small>{house.stem} {house.branch}</small></h2>
        <p id="thiendo-palace-reader-description">Đọc đầy đủ từng lớp sao trên một cung, không phải phóng ảnh bị mất nét.</p>
      </div>
      <button type="button" className="palace-reader-close" ref={closeRef} onClick={() => modalRef.current?.close()} aria-label="Đóng phòng đọc cung">× <span>Đóng</span></button>
    </div>

    <div className="palace-reader-toolbar" role="group" aria-label="Điều hướng và cỡ chữ phòng đọc">
      <button type="button" onClick={() => move('previous')} aria-label="Cung trước">← Cung trước</button>
      <span className="palace-reader-current" aria-live="polite">{house.palace} · {house.branch}</span>
      <button type="button" onClick={() => move('next')} aria-label="Cung sau">Cung sau →</button>
      <button type="button" className="palace-reader-font-toggle" aria-pressed={largeText} onClick={() => setLargeText(value => !value)}>{largeText ? 'A− Chữ thường' : 'A+ Chữ lớn'}</button>
    </div>

    <div className="palace-reader-overview" aria-label="Tổng quan cung đang xem">
      <span><small>CHÍNH TINH</small><strong>{house.stars.length ? house.stars.join(' · ') : 'Vô chính diệu'}</strong></span>
      <span><small>PHỤ TINH & SAO BỔ SUNG</small><strong>{house.auxiliaryStars.length + house.yearStars.length + (house.additionalStars?.length ?? 0) + (house.traditionalStars?.length ?? 0) + (house.natalExtensionStars?.length ?? 0) + (house.beneficStars?.length ?? 0) + (house.advancedStars?.length ?? 0)} sao</strong></span>
      <span><small>ĐẠI HẠN</small><strong>{house.daiHan?.fromAge ?? '—'}–{house.daiHan?.toAge ?? '—'} tuổi mụ</strong></span>
    </div>

    <div className="palace-reader-content" key={house.branchIndex}>
      <PalaceDetails house={house} ruleSet={ruleSet} annual={annual} showAnnual={showAnnual} showStrength={showStrength} detailId="thiendo-palace-reader-details" />
    </div>
    <div className="palace-reader-footer">Trích trực tiếp dữ liệu lá số đang xem · Phím Esc để đóng · Không thay đổi phép an sao.</div>
  </dialog>;
}
