'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { usePathname } from 'next/navigation';
import { AdminInsightWorkspace } from './workspace';
import styles from './chat.module.css';
import { WindowIcon } from './window-icon';
import { clampAssistantPosition } from './panel-geometry';

/** Mounted only inside the verified AdminSession; never persists report data. */
export function FloatingAdminAssistant() {
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expanded, setExpanded] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const offset = useRef({
    x: 0,
    y: 0
  });
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  function resetPosition() {
    offset.current = {
      x: 0,
      y: 0
    };
    if (panel.current) panel.current.style.translate = '0px 0px';
    drag.current = null;
  }
  function restoreFocus() {
    requestAnimationFrame(() => launcher.current?.focus());
  }
  function hide(clear: boolean) {
    if (closing.current) return;
    setLeaving(true);
    closing.current = setTimeout(() => {
      closing.current = null;
      setLeaving(false);
      if (clear) {
        setOpened(false);
        setMinimized(false);
        setExpanded(false);
        resetPosition();
      } else setMinimized(true);
      restoreFocus();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.thiendoEffects === 'reduced' ? 0 : 160);
  }
  function minimize() {
    hide(false);
  }
  function close() {
    hide(true);
  }
  useEffect(() => () => {
    if (closing.current) clearTimeout(closing.current);
  }, []);
  useEffect(() => {
    const reset = () => resetPosition();
    window.addEventListener('resize', reset);
    window.visualViewport?.addEventListener('resize', reset);
    return () => {
      window.removeEventListener('resize', reset);
      window.visualViewport?.removeEventListener('resize', reset);
    };
  }, []);
  useEffect(() => {
    if (opened && !minimized) panel.current?.querySelector<HTMLButtonElement>('[data-panel-focus]')?.focus();
  }, [opened, minimized]);
  useEffect(() => {
    resetPosition();
  }, [expanded]);
  function start(event: PointerEvent<HTMLElement>) {
    if (expanded || window.innerWidth < 640 || event.button !== 0 || (event.target as HTMLElement).closest('button,a')) return;
    const rect = panel.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLElement>) {
    const current = drag.current,
      element = panel.current;
    if (!current || current.id !== event.pointerId || !element) return;
    const rect = element.getBoundingClientRect();
    const visual = window.visualViewport;
    const viewport = visual
      ? {left: visual.offsetLeft, top: visual.offsetTop, width: visual.width, height: visual.height}
      : {left: 0, top: 0, width: window.innerWidth, height: window.innerHeight};
    const next = clampAssistantPosition(
      {left: current.left, top: current.top},
      {x: event.clientX - current.x, y: event.clientY - current.y},
      {width: rect.width, height: rect.height}, viewport
    );
    offset.current.x += next.left - rect.left;
    offset.current.y += next.top - rect.top;
    element.style.translate = `${offset.current.x}px ${offset.current.y}px`;
  }
  if (pathname === '/admin/tro-ly') return null;
  return <>
    <button ref={launcher} type="button" className={styles.launcher} aria-label={opened && minimized ? 'Mở lại trợ lý AI' : 'Mở trợ lý AI'} aria-expanded={opened && !minimized} aria-controls={opened ? 'admin-ai-panel' : undefined} onClick={() => {
      if (closing.current) {
        clearTimeout(closing.current);
        closing.current = null;
      }
      setLeaving(false);
      setOpened(true);
      setMinimized(false);
    }}>
      <span aria-hidden="true">✦</span>
      <span>Trợ lý AI<small>Thiên Đồ</small></span>
    </button>
    {opened && <div ref={panel} id="admin-ai-panel" role="dialog" aria-modal="false" aria-labelledby="admin-ai-title" hidden={minimized} className={`${styles.panel} ${expanded ? styles.expanded : ''} ${leaving ? styles.leaving : ''}`} onKeyDown={event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        minimize();
      }
    }}>
      <header className={styles.panelHeader} onPointerDown={start} onPointerMove={move} onPointerUp={() => {
        drag.current = null;
      }} onPointerCancel={() => {
        drag.current = null;
      }} onLostPointerCapture={() => {
        drag.current = null;
      }}>
        <div>
          <span aria-hidden="true">✦</span>
          <strong id="admin-ai-title">Thiên Đồ AI<small>Trợ lý quản trị · Chỉ đọc</small></strong>
        </div>
        <div className={styles.windowActions}>
          <button type="button" data-panel-focus aria-label="Đưa cửa sổ về vị trí ban đầu" onClick={resetPosition}><WindowIcon name="reset"/></button>
          <button type="button" aria-label={expanded ? 'Thu về cửa sổ' : 'Mở rộng cửa sổ'} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}><WindowIcon name={expanded?'collapse':'expand'}/></button>
          <button type="button" aria-label="Thu gọn trợ lý AI" onClick={minimize}><WindowIcon name="minimize"/></button>
          <button type="button" aria-label="Đóng và xóa hội thoại AI" onClick={close}><WindowIcon name="close"/></button>
        </div>
      </header>
      <AdminInsightWorkspace embedded />
    </div>}
  </>;
}
