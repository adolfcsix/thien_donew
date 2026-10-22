import type { AstrologyHouse } from '@thiendo/shared-types';

/** Consumes engine positions only. No implied stars and no predictive rules. */
export function natalStarNames(house: AstrologyHouse): string[] {
  return [...new Set([
    ...house.stars, ...house.auxiliaryStars, ...house.yearStars,
    ...(house.additionalStars ?? []), ...(house.traditionalStars ?? []),
    ...(house.natalExtensionStars ?? []), ...(house.beneficStars ?? []),
    ...(house.positionalStars ?? []), ...(house.missingStars ?? []),
    ...(house.derivedStars ?? []), ...(house.advancedStars ?? []),
    ...house.cycleStars.thaiTue, ...house.cycleStars.bacSi,
    ...house.cycleStars.trangSinh,
  ])];
}

export type Relationship = 'Đồng cung' | 'Tam hợp' | 'Đối cung' | 'Giáp cung' | 'Cung khác';
export function relativePalace(fromBranch: number, toBranch: number): Relationship {
  const offset = ((toBranch - fromBranch) % 12 + 12) % 12;
  if (offset === 0) return 'Đồng cung';
  if (offset === 4 || offset === 8) return 'Tam hợp';
  if (offset === 6) return 'Đối cung';
  if (offset === 1 || offset === 11) return 'Giáp cung';
  return 'Cung khác';
}
export function locateNatalStar(houses: readonly AstrologyHouse[], name: string, fromBranch: number) {
  return houses.filter(house => natalStarNames(house).includes(name))
    .map(house => ({name, palace: house.palace, branch: house.branch, branchIndex: house.branchIndex,
      relation: relativePalace(fromBranch, house.branchIndex)}));
}
