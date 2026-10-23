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
    type Enhancement = {initial: Record<string,string|null>; applied: Map<string,string|null>; released: Set<string>; hadClass: boolean};
    const enhanced = new Map<HTMLElement, Enhancement>();
    // A React page may replace its label/role while this observer is mounted.
    // Only write fallback values still owned by this enhancer.
    function fallback(wrapper: HTMLElement, state: Enhancement, attribute: string, value: string|null) {
      if (state.initial[attribute] !== null || state.released.has(attribute)) return;
      const current = wrapper.getAttribute(attribute);
      if (current !== (state.applied.has(attribute) ? state.applied.get(attribute) : null)) {
        state.released.add(attribute); state.applied.delete(attribute); return;
      }
      if (value === null) wrapper.removeAttribute(attribute); else wrapper.setAttribute(attribute,value);
      state.applied.set(attribute,value);
    }
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
          enhanced.set(wrapper, {initial: Object.fromEntries(['tabindex','role','aria-label'].map(attribute=>[attribute,wrapper.getAttribute(attribute)])), applied:new Map(), released:new Set(), hadClass:wrapper.classList.contains('readable-table')});
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
        fallback(wrapper,original,'tabindex',overflows?'0':null);
        fallback(wrapper,original,'role',overflows?'region':null);
        const headings = Array.from(wrapper.querySelectorAll('thead th')).slice(0,3).map(cell=>cell.textContent?.trim()).filter(Boolean).join(', ');
        fallback(wrapper,original,'aria-label',overflows?`Bảng dữ liệu${headings ? ': ' + headings : ''}. Cuộn ngang để xem thêm cột.`:null);
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
        if (!original.hadClass) wrapper.classList.remove('readable-table');
        delete wrapper.dataset.overflow;
        for (const [attribute, value] of original.applied) {
          if (wrapper.getAttribute(attribute) === value) wrapper.removeAttribute(attribute);
        }
      });
    };
  }, [route]);
  return null;
}
