/** Progressive decoration: never hides server-rendered targets while waiting for JS.
 * Application streaming/loading is separate; missing motion APIs leave targets untouched.
 * One observation per card, no scroll listener, layout writes or animation library.
 */
export function installScrollReveal(root: HTMLElement, initial = false): () => void {
  if (typeof IntersectionObserver === 'undefined' || typeof Element.prototype.animate !== 'function') return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const contrast = matchMedia('(prefers-contrast: more)');
  const seen = new WeakSet<Element>();
  const pending = new Set<HTMLElement>();
  const active = new Map<HTMLElement, Animation>();
  let disposed = false;
  const disabled = () => disposed || document.visibilityState !== 'visible' || reduced.matches || contrast.matches || document.documentElement.dataset.thiendoEffects === 'reduced';
  const focused = (node: HTMLElement) => node.contains(document.activeElement);
  function cancel(node: HTMLElement) {
    active.get(node)?.cancel();
    active.delete(node);
  }
  function reveal(node: HTMLElement, order: number) {
    pending.delete(node);
    observer.unobserve(node);
    seen.add(node);
    if (disabled() || focused(node) || active.size >= 3) return;
    try {
      const animation = node.animate([
        { opacity: 0.65, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { id: 'thiendo-reveal', duration: 280, delay: Math.min(order, 2) * 35, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      active.set(node, animation);
      animation.onfinish = () => cancel(node);
      animation.oncancel = () => active.delete(node);
    } catch { /* Optional decoration must never block reading or navigation. */ }
  }
  const observer = new IntersectionObserver(entries => {
    let order = 0;
    for (const entry of entries) if (entry.isIntersecting && pending.has(entry.target as HTMLElement)) reveal(entry.target as HTMLElement, order++);
  }, { threshold: 0.08 });
  function stop() {
    observer.disconnect();
    pending.clear();
    for (const node of active.keys()) cancel(node);
  }
  function scan(enter = false) {
    stop();
    if (disabled()) return;
    let order = 0;
    for (const node of root.querySelectorAll<HTMLElement>('[data-scroll-reveal]')) {
      if (seen.has(node)) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom > 0 && rect.top < innerHeight) {
        // Never fade an already visible heading/hero after hydration or tab return.
        if (enter) reveal(node, order++); else seen.add(node);
      } else { pending.add(node); observer.observe(node); }
    }
  }
  const changed = () => scan();
  const focus = (event: FocusEvent) => {
    const node = (event.target as Element | null)?.closest<HTMLElement>('[data-scroll-reveal]');
    if (!node || !root.contains(node)) return;
    seen.add(node); pending.delete(node); observer.unobserve(node); cancel(node);
  };
  const settings = new MutationObserver(changed);
  settings.observe(document.documentElement, { attributes: true, attributeFilter: ['data-thiendo-effects'] });
  reduced.addEventListener('change', changed);
  contrast.addEventListener('change', changed);
  document.addEventListener('visibilitychange', changed);
  root.addEventListener('focusin', focus);
  scan(initial);
  return () => {
    disposed = true; stop(); settings.disconnect();
    reduced.removeEventListener('change', changed);
    contrast.removeEventListener('change', changed);
    document.removeEventListener('visibilitychange', changed);
    root.removeEventListener('focusin', focus);
  };
}
