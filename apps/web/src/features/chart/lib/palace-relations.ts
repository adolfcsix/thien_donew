/**
 * Geography-only relationships on the traditional 12-branch ring.
 * This helper does not grade stars or make divinatory predictions.
 */
export function relatedBranches(branchIndex: number) {
  if (!Number.isInteger(branchIndex) || branchIndex < 0 || branchIndex > 11) {
    throw new RangeError('Địa chi phải nằm trong khoảng 0–11');
  }
  return {
    tamHop: [(branchIndex + 4) % 12, (branchIndex + 8) % 12] as const,
    doiCung: (branchIndex + 6) % 12,
  };
}
