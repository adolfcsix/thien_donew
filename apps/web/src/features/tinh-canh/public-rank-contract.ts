import { medalDesign } from './medal-designs';
export type PublicRank = {
  level: number;
  name: string;
  stageName: string;
  points: number;
  source: 'earned' | 'admin';
};
export function publicRankResponse(raw: unknown): PublicRank {
  if (!raw || typeof raw !== 'object' || !('progress' in raw)) throw Error('Phản hồi cảnh giới chưa hợp lệ.');
  const progress = raw.progress as Record<string, unknown>,
    rank = progress?.rank as Record<string, unknown>;
  const level = rank?.level;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 18 || !Number.isSafeInteger(progress.points) || Number(progress.points) < 0 || !['earned', 'admin'].includes(String(progress.rankSource))) throw Error('Phản hồi cảnh giới chưa hợp lệ.');
  const canonical = medalDesign(level);
  if (rank.name !== canonical.name || rank.stageName !== canonical.stageName) throw Error('Tên cảnh giới chưa khớp quy tắc hiện tại.');
  return {
    level,
    name: canonical.name,
    stageName: canonical.stageName,
    points: Number(progress.points),
    source: progress.rankSource as PublicRank['source']
  };
}
