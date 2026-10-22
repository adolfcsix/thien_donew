import type { Point } from './palace-relation-lines';

/** Visual-only easing. An sao and the relationships themselves are unaffected. */
export function easeOutCubic(progress: number): number {
  const t = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 1));
  return 1 - (1 - t) ** 3;
}

export function interpolatePoint(start: Point, end: Point, progress: number): Point {
  const t = easeOutCubic(progress);
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
}
