/** V10.3: the write-capable HTTP E2E stage is strictly gated by smoke success.
 * Synchronous callback enables independent tests without a running database.
 */
export function smokeBeforeDestructiveE2E(runStage) {
  if (typeof runStage !== 'function') throw new TypeError('Expected release stage runner');
  if (!runStage('smoke')) return false;
  return Boolean(runStage('e2e'));
}
