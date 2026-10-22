/**
 * Star display taxonomy. This is deliberately PRESENTATION ONLY.
 * Names are matched exactly: never infer auspiciousness from color or silently
 * merge annual, natal, cycle and transformation placements.
 * These are reading aids, not a classical cát/hung verdict.
 */
export type StarTone = 'main' | 'support' | 'challenging' | 'transform' | 'annual' | 'cycle' | 'neutral';
export type StarLayer = 'natal' | 'annual' | 'cycle';

import groups from '@thiendo/knowledge/src/star-display-groups.json';
const supportive = new Set<string>(groups.support);
const challenging = new Set<string>(groups.challenging);
const mainStars = new Set<string>(groups.main);
const transformations = new Set<string>(groups.transform);

/** The optional layer comes from the caller, not a guess based on star color. */
export function starTone(name: string, layer: StarLayer = 'natal'): StarTone {
  if (layer === 'annual') return 'annual';
  if (layer === 'cycle') return 'cycle';
  const title = name.split(' · ')[0]?.trim() ?? name;
  if (transformations.has(title)) return 'transform';
  if (mainStars.has(name)) return 'main';
  if (challenging.has(name)) return 'challenging';
  if (supportive.has(name)) return 'support';
  return 'neutral';
}

export const toneLabels: Record<StarTone, string> = {
  main: 'Chính tinh',
  support: 'Nhóm sao trợ lực (theo quy ước hiển thị)',
  challenging: 'Nhóm Lục sát (theo quy ước hiển thị)',
  transform: 'Tứ Hóa',
  annual: 'Sao lưu / lớp năm xem',
  cycle: 'Vòng sao',
  neutral: 'Sao khác / chưa phân nhóm',
};
