import type { AstrologyHouse, AnnualOverview } from '@thiendo/shared-types';

/** Presentation helpers only: never alter palace positions or astrology rules. */
export function normalizePalaceSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function orderedPalaces(houses: readonly AstrologyHouse[]): AstrologyHouse[] {
  return [...houses].sort((a, b) => a.cell - b.cell);
}

export function palaceSearchText(house: AstrologyHouse, annual?: AnnualOverview, includeAnnual = true): string {
  const annualNames = includeAnnual && annual ? [
    ...annual.luuTuHoa.items.filter(item => item.branch === house.branchIndex).flatMap(item => [item.name, item.star]),
    ...annual.luuStars.items.filter(item => item.branch === house.branchIndex).map(item => item.name),
  ] : [];
  return normalizePalaceSearch([
    house.palace, house.branch, house.stem, house.isThan ? 'thân' : '',
    ...house.stars, ...house.auxiliaryStars, ...house.yearStars, ...(house.additionalStars ?? []), ...(house.traditionalStars ?? []), ...(house.natalExtensionStars ?? []), ...(house.beneficStars ?? []), ...(house.positionalStars ?? []), ...(house.derivedStars ?? []), ...(house.missingStars ?? []), ...(house.advancedStars ?? []), ...(house.obstructionMarkers ?? []),
    ...house.tuHoa.flatMap(item => [item.name, item.star]),
    ...house.cycleStars.thaiTue, ...house.cycleStars.bacSi, ...house.cycleStars.trangSinh,
    ...annualNames,
  ].join(' '));
}

export function matchingPalaces(houses: readonly AstrologyHouse[], query: string, annual?: AnnualOverview, includeAnnual = true): AstrologyHouse[] {
  const needle = normalizePalaceSearch(query);
  const ordered = orderedPalaces(houses);
  if (!needle) return ordered;
  const terms = needle.split(' ').filter(Boolean);
  return ordered.filter(house => {
    const text = palaceSearchText(house, annual, includeAnnual);
    return terms.every(term => text.includes(term));
  });
}

export function adjacentPalaceBranch(houses: readonly AstrologyHouse[], currentBranch: number, movement: 'previous' | 'next' | 'first' | 'last'): number | null {
  const ordered = orderedPalaces(houses);
  if (!ordered.length) return null;
  if (movement === 'first') return ordered[0].branchIndex;
  if (movement === 'last') return ordered[ordered.length - 1].branchIndex;
  const index = ordered.findIndex(house => house.branchIndex === currentBranch);
  const safeIndex = index < 0 ? 0 : index;
  const nextIndex = movement === 'next'
    ? (safeIndex + 1) % ordered.length
    : (safeIndex - 1 + ordered.length) % ordered.length;
  return ordered[nextIndex].branchIndex;
}
