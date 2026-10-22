import type { AstrologyHouse, AnnualOverview } from '@thiendo/shared-types';
import { relatedBranches } from './palace-relations';

/** Presentation-only focus of a palace within the 12-branch geography. */
export type PalaceFocusScope = 'single' | 'tam-hop' | 'tu-chinh';
export type PalaceFocusRole = 'current' | 'tam-hop' | 'doi-cung';

export type PalaceFocusItem = {
  house: AstrologyHouse;
  role: PalaceFocusRole;
};

/** Return the focus order: current → two tam hợp positions → đối cung. */
export function palaceFocusItems(
  houses: readonly AstrologyHouse[],
  selectedBranch: number,
  scope: PalaceFocusScope,
): PalaceFocusItem[] {
  const { tamHop, doiCung } = relatedBranches(selectedBranch);
  const desired: { branch: number; role: PalaceFocusRole }[] = [{ branch: selectedBranch, role: 'current' }];
  if (scope !== 'single') {
    desired.push(...tamHop.map(branch => ({ branch, role: 'tam-hop' as const })));
  }
  if (scope === 'tu-chinh') desired.push({ branch: doiCung, role: 'doi-cung' });
  const byBranch = new Map(houses.map(house => [house.branchIndex, house]));
  return desired.flatMap(({branch,role}) => {
    const house = byBranch.get(branch);
    return house ? [{house,role}] : [];
  });
}

/** Identifies a marker by the branch, not the mutable cell/array index. */
export function annualMarkersAt(annual: AnnualOverview, branchIndex: number): string[] {
  return [
    ...(annual.luuThaiTueBranchIndex === branchIndex ? ['Lưu Thái Tuế'] : []),
    ...(annual.activeDaiHan?.branchIndex === branchIndex ? ['Đại hạn'] : []),
    ...(annual.tieuHan.branchIndex === branchIndex ? ['Tiểu hạn'] : []),
  ];
}

export function nextAnnualYear(year: number, direction: -1 | 1, earliest: number, latest = 2100): number {
  const lower = Math.max(1900, Math.min(latest, Math.trunc(earliest)));
  return Math.min(latest, Math.max(lower, Math.trunc(year) + direction));
}
