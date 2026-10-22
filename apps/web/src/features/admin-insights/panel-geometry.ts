/** Clamp a draggable, non-modal admin assistant within the actually visible viewport.
 * VisualViewport can be smaller or offset when the user zooms or a keyboard opens.
 * All coordinates are CSS pixels in the layout viewport coordinate space.
 */
export interface AssistantBounds { left: number; top: number; width: number; height: number }
export interface AssistantPoint { x: number; y: number }

export function clampAssistantPosition(
  start: { left: number; top: number },
  delta: AssistantPoint,
  panel: { width: number; height: number },
  viewport: AssistantBounds,
  margin = 8
): { left: number; top: number } {
  const minLeft = viewport.left + margin;
  const minTop = viewport.top + margin;
  const maxLeft = Math.max(minLeft, viewport.left + viewport.width - panel.width - margin);
  const maxTop = Math.max(minTop, viewport.top + viewport.height - panel.height - margin);
  const clamp = (value: number, lower: number, upper: number) => Math.min(upper, Math.max(lower, value));
  return {
    left: clamp(start.left + delta.x, minLeft, maxLeft),
    top: clamp(start.top + delta.y, minTop, maxTop),
  };
}
