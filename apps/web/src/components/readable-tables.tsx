'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Enhance existing scroll wrappers without reparenting React-owned table nodes. */
export function ReadableTables() {
  const route = usePathname();
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    let frame = 0;
    const enhanced = new Map<HTMLElement, {tabindex: string | null; role: string | null; label: string | null}>();
    const observed = new Set<Element>();
    const resize = new ResizeObserver(schedule);
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    function update() {
      if (!main) return;
      for (const element of observed) {
        if (!element.isConnected) { resize.unobserve(element); observed.delete(element); }
      }
      main.querySelectorAll('table').forEach(table => {
        let wrapper = table.parentElement;
        while (wrapper && wrapper !== main && !['auto', 'scroll'].includes(getComputedStyle(wrapper).overflowX)) wrapper = wrapper.parentElement;
        if (!wrapper || wrapper === main) return;
        if (!enhanced.has(wrapper)) {
          enhanced.set(wrapper, {tabindex: wrapper.getAttribute('tabindex'), role: wrapper.getAttribute('role'), label: wrapper.getAttribute('aria-label')});
          wrapper.classList.add('readable-table');
        }
        for (const element of [wrapper, table]) {
          if (!observed.has(element)) { resize.observe(element); observed.add(element); }
        }
      });
      enhanced.forEach((original, wrapper) => {
        if (!wrapper.isConnected) { resize.unobserve(wrapper); enhanced.delete(wrapper); return; }
        const overflows = wrapper.scrollWidth > wrapper.clientWidth + 1;
        wrapper.dataset.overflow = String(overflows);
        if (original.tabindex === null) {
          if (overflows) wrapper.tabIndex = 0; else wrapper.removeAttribute('tabindex');
        }
        if (original.role === null) {
          if (overflows) wrapper.setAttribute('role', 'region'); else wrapper.removeAttribute('role');
        }
        if (original.label === null) {
          if (overflows) {
            const headings = Array.from(wrapper.querySelectorAll('thead th')).slice(0, 3).map(cell => cell.textContent?.trim()).filter(Boolean).join(', ');
            wrapper.setAttribute('aria-label', `Bảng dữ liệu${headings ? ': ' + headings : ''}. Cuộn ngang để xem thêm cột.`);
          } else wrapper.removeAttribute('aria-label');
        }
      });
    }
    const mutation = new MutationObserver(records => {
      const affectsTable = records.some(record => {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        if (target?.closest('table, .readable-table')) return true;
        return [...record.addedNodes, ...record.removedNodes].some(node =>
          node instanceof Element && (node.matches('table') || Boolean(node.querySelector('table'))));
      });
      if (affectsTable) schedule();
    });
    mutation.observe(main, {childList: true, subtree: true});
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      mutation.disconnect(); resize.disconnect();
      enhanced.forEach((original, wrapper) => {
        wrapper.classList.remove('readable-table'); delete wrapper.dataset.overflow;
        for (const [attribute, value] of Object.entries({tabindex: original.tabindex, role: original.role, 'aria-label': original.label})) {
          if (value === null) wrapper.removeAttribute(attribute); else wrapper.setAttribute(attribute, value);
        }
      });
    };
  }, [route]);
  return null;
}
