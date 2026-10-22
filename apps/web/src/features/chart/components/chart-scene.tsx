'use client';
import {CelestialOrnament} from './celestial-ornament';
import { useEffect, useRef, useState, type ReactNode } from 'react';
/** Decorative depth only; chart geometry and calculations stay unchanged. */
export function ChartScene({ children }: { children: ReactNode }) {
  const scene = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(true);
  // Preferences belong to this visual layer only; chart calculations are unaffected.
  useEffect(() => {
    try { if (window.localStorage.getItem('thiendo.chart.depth.v1') === 'off') setEnabled(false); }
    catch { /* Storage can be unavailable in private browsing. */ }
  }, []);
  function toggleDepth() {
    setEnabled(current => {
      const next = !current;
      try { window.localStorage.setItem('thiendo.chart.depth.v1', next ? 'on' : 'off'); }
      catch { /* Keep the in-memory preference. */ }
      return next;
    });
  }
  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0, clientX = 0, clientY = 0;
    let inView = typeof IntersectionObserver === 'undefined';
    const sync = () => {
      element.dataset.motion = enabled && inView && !reduced.matches && !document.hidden && document.documentElement.dataset.thiendoEffects !== 'reduced' ? 'active' : 'paused';
      if (element.dataset.motion === 'paused') {
        cancelAnimationFrame(frame); frame = 0;
        element.style.removeProperty('--scene-light-x'); element.style.removeProperty('--scene-light-y');
      }
    };
    const move = (event: PointerEvent) => {
      // A hybrid laptop can match pointer:fine while this event is a touch.
      // Touch scrolling must not leave a simulated hover light behind.
      if (event.pointerType === 'touch') { resetLight(); return; }
      if (element.dataset.motion !== 'active' || !pointer.matches) return;
      clientX = event.clientX; clientY = event.clientY;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (element.dataset.motion !== 'active' || !pointer.matches) return;
        // Read current geometry once for the latest event in this frame, after
        // any intervening resize/scroll, instead of reading on every input.
        const bounds = element.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) { resetLight(); return; }
        const x = Math.max(0, Math.min(100, (clientX - bounds.left) / bounds.width * 100));
        const y = Math.max(0, Math.min(100, (clientY - bounds.top) / bounds.height * 100));
        element.style.setProperty('--scene-light-x', `${x}%`);
        element.style.setProperty('--scene-light-y', `${y}%`);
      });
    };
    const resetLight = () => {
      cancelAnimationFrame(frame); frame = 0;
      element.style.removeProperty('--scene-light-x');
      element.style.removeProperty('--scene-light-y');
    };
    const viewport=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);sync();});
    viewport?.observe(element);
    const settings = new MutationObserver(sync);
    settings.observe(document.documentElement, { attributes: true, attributeFilter: ['data-thiendo-effects'] });
    sync(); reduced.addEventListener('change', sync);
    pointer.addEventListener('change', resetLight);
    window.addEventListener('blur', resetLight);
    document.addEventListener('visibilitychange', sync);
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', resetLight);
    element.addEventListener('pointercancel', resetLight);
    return () => { resetLight(); viewport?.disconnect(); settings.disconnect(); reduced.removeEventListener('change', sync); pointer.removeEventListener('change', resetLight); window.removeEventListener('blur', resetLight); document.removeEventListener('visibilitychange', sync); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', resetLight); element.removeEventListener('pointercancel', resetLight); };
  }, [enabled]);
  return <div ref={scene} className="chart-scene" data-motion="paused" data-depth={enabled ? 'on' : 'off'}>
    <div className="chart-scene-engraving" aria-hidden="true"><CelestialOrnament/><span className="chart-scene-orbit chart-scene-orbit-outer"/><span className="chart-scene-orbit chart-scene-orbit-inner"/></div>
    <div className="chart-scene-bar"><span title="紫微斗數">TỬ VI ĐẨU SỐ <b>ĐỊA BÀN TƯƠNG TÁC</b></span><button type="button" aria-pressed={enabled} aria-label={`Hiệu ứng chiều sâu và ánh sáng của lá số: ${enabled ? 'đang bật' : 'đang tắt'}`} onClick={toggleDepth}>Ánh sáng &amp; chiều sâu · {enabled ? 'Bật' : 'Tắt'}</button></div>
    {children}
  </div>;
}
