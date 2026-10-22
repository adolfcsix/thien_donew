/** One viewport observer and tab listener shared by mounted decorative SVGs.
 * No React state updates per intersection; shape, colors and animation stay in SVG/CSS.
 */
const targets = new Map<SVGSVGElement | HTMLElement, boolean>();
let observer: IntersectionObserver | null = null;

function update(node: SVGSVGElement | HTMLElement, inView: boolean) {
  const paused = String(!inView || document.visibilityState !== 'visible');
  if (node.dataset.paused !== paused) node.dataset.paused = paused;
}
function visibilityChanged() {
  targets.forEach((inView, node) => update(node, inView));
}
export function observeVisibleMotion(node: SVGSVGElement | HTMLElement): () => void {
  if (targets.size === 0) {
    document.addEventListener('visibilitychange', visibilityChanged);
    if (typeof IntersectionObserver !== 'undefined') observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const target = entry.target as SVGSVGElement | HTMLElement;
        if (!targets.has(target)) continue;
        targets.set(target, entry.isIntersecting);
        update(target, entry.isIntersecting);
      }
    });
  }
  const inView = observer === null;
  targets.set(node, inView);
  update(node, inView);
  observer?.observe(node);
  return () => {
    observer?.unobserve(node);
    targets.delete(node);
    if (targets.size === 0) {
      observer?.disconnect();observer = null;
      document.removeEventListener('visibilitychange', visibilityChanged);
    }
  };
}
