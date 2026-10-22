import type {PoolClient} from 'pg';
import Rules = require('../../../../../packages/knowledge/src/tinh-canh-ranks.cjs');

/** Same ledger/reversal/legacy/manual semantics as TinhCanhService; no rank formula copy. */
export async function publicRankSnapshot(client: PoolClient, minLevel: number) {
  const candidates = await client.query<{id: string; name: string}>(`
    SELECT u.id,COALESCE(NULLIF(u.display_name,''),u.username,'Thành viên') AS name
    FROM users u WHERE (
      EXISTS(SELECT 1 FROM tinh_van_awards a WHERE a.user_id=u.id) OR
      EXISTS(SELECT 1 FROM forum_tinh_van_ledger l WHERE l.user_id=u.id) OR
      EXISTS(SELECT 1 FROM tinh_canh_rank_grants g WHERE g.user_id=u.id)
    ) AND NOT EXISTS(SELECT 1 FROM tinh_canh_preferences p WHERE p.user_id=u.id AND p.public_rank=false)
      AND NOT EXISTS(SELECT 1 FROM account_blocks b WHERE b.user_id=u.id)
      AND NOT EXISTS(SELECT 1 FROM forum_suspensions s WHERE s.user_id=u.id AND s.expires_at>clock_timestamp())
    ORDER BY u.id LIMIT 501`);
  const members = candidates.rows.slice(0, 500), ids = members.map(row => row.id);
  if (!ids.length) return {entries: [], scanned: 0, truncated: false, minLevel, matchingInSample: 0};
  const earned = await client.query<{user_id: string; direction: string; points: string; events: string}>(`
    SELECT a.user_id,a.direction,SUM(a.points)::text AS points,COUNT(*)::text AS events
    FROM tinh_van_awards a LEFT JOIN tinh_van_reversals r ON r.award_id=a.id
    WHERE a.user_id=ANY($1::uuid[]) AND r.id IS NULL GROUP BY a.user_id,a.direction`, [ids]);
  const legacy = await client.query<{user_id: string; points: string; events: string}>(`
    SELECT z.user_id,SUM(z.points)::text AS points,COUNT(*)::text AS events FROM (
      SELECT l.user_id,l.comment_id,SUM(l.points)::bigint AS points FROM forum_tinh_van_ledger l
      JOIN forum_comments c ON c.id=l.comment_id JOIN forum_threads t ON t.id=c.thread_id
      WHERE l.user_id=ANY($1::uuid[]) AND c.state='visible' AND t.state='visible' AND t.visibility='public'
      GROUP BY l.user_id,l.comment_id HAVING SUM(l.points)>0
    ) z GROUP BY z.user_id`, [ids]);
  const manual = await client.query<{user_id: string; level: number}>(`
    SELECT DISTINCT ON(g.user_id) g.user_id,g.level FROM tinh_canh_rank_grants g
    LEFT JOIN tinh_canh_rank_revocations r ON r.grant_id=g.id
    WHERE g.user_id=ANY($1::uuid[]) AND r.id IS NULL ORDER BY g.user_id,g.id DESC`, [ids]);
  const earnedByUser = new Map<string, {points: number; counts: Record<string, number>}>();
  for (const row of earned.rows) {
    const item = earnedByUser.get(row.user_id) || {points: 0, counts: {}};
    item.points += Number(row.points); item.counts[row.direction] = Number(row.events);
    earnedByUser.set(row.user_id, item);
  }
  const legacyByUser = new Map(legacy.rows.map(row => [row.user_id, row]));
  const manualByUser = new Map(manual.rows.map(row => [row.user_id, Number(row.level)]));
  const matches = members.map(member => {
    const ledger = earnedByUser.get(member.id), old = legacyByUser.get(member.id);
    const score = Rules.evaluate(ledger?.points || 0, ledger?.counts || {}, Number(old?.points || 0), Number(old?.events || 0));
    const grant = manualByUser.get(member.id), rank = grant ? Rules.ranks[grant - 1] : score.rank;
    return {userId: member.id, displayName: member.name, level: rank.level, rankName: rank.name,
      points: score.points, rankSource: grant ? 'admin' : 'earned'};
  }).filter(row => row.level >= minLevel).sort((a, b) => b.level - a.level || b.points - a.points || a.userId.localeCompare(b.userId));
  return {entries: matches.slice(0, 30), scanned: members.length,
    truncated: candidates.rows.length > 500, minLevel, matchingInSample: matches.length};
}
