import { adminObject, adminString, adminInteger, adminId, adminList, invalidAdminResponse } from '@/features/admin/response-contract';
function timestamp(value: unknown) {
  const text = adminString(value);
  if (!Number.isFinite(Date.parse(text))) invalidAdminResponse();
  return text;
}
export function insightReport(raw: unknown) {
  const row = adminObject(raw);
  const facts = adminList(row.facts, item => {
    const f = adminObject(item);
    return {
      id: adminString(f.id),
      label: adminString(f.label),
      value: adminInteger(f.value),
      source: adminString(f.source)
    };
  });
  if (facts.length > 24 || new Set(facts.map(f => f.id)).size !== facts.length) invalidAdminResponse();
  const warnings = adminList(row.warnings, adminString);
  const ranks = row.ranks === null ? null : (() => {
    const r = adminObject(row.ranks);
    if (typeof r.truncated !== 'boolean') invalidAdminResponse();
    const entries = adminList(r.entries, item => {
      const entry = adminObject(item),
        level = adminInteger(entry.level, 1);
      if (level > 18 || !['admin', 'earned'].includes(String(entry.rankSource))) invalidAdminResponse();
      return {
        userId: adminId(entry.userId),
        displayName: adminString(entry.displayName),
        level,
        rankName: adminString(entry.rankName),
        points: adminInteger(entry.points),
        rankSource: adminString(entry.rankSource)
      };
    });
    if (entries.length > 30) invalidAdminResponse();
    return {
      entries,
      truncated: r.truncated,
      scanned: adminInteger(r.scanned),
      matchingInSample: adminInteger(r.matchingInSample),
      minLevel: adminInteger(r.minLevel, 1)
    };
  })();
  const interpretation = row.interpretation === null ? null : (() => {
    const i = adminObject(row.interpretation);
    const findings = adminList(i.findings, item => {
      const f = adminObject(item),
        evidenceIds = adminList(f.evidenceIds, adminString);
      if (!evidenceIds.length || evidenceIds.some(id => !facts.some(fact => fact.id === id))) invalidAdminResponse();
      return {
        text: adminString(f.text),
        evidenceIds
      };
    });
    return {
      summary: adminString(i.summary),
      model: adminString(i.model),
      findings
    };
  })();
  const tracking = row.tracking === null ? null : (() => {
    const t = adminObject(row.tracking);
    if (typeof t.enabled !== 'boolean') invalidAdminResponse();
    return {
      enabled: t.enabled,
      startedAt: t.startedAt === null ? null : timestamp(t.startedAt)
    };
  })();
  if (row.timeZone !== 'Asia/Ho_Chi_Minh') invalidAdminResponse();
  const queues=row.queues===undefined||row.queues===null?null:(()=>{const q=adminObject(row.queues);
    const orders=adminList(q.orders,value=>{const o=adminObject(value);if(!['creating','pending'].includes(String(o.status))) invalidAdminResponse();return {id:adminId(o.id),amountVnd:adminInteger(o.amountVnd),status:adminString(o.status),createdAt:timestamp(o.createdAt)};});
    const reports=adminList(q.reports,value=>{const r=adminObject(value);if(!['open','reviewing'].includes(String(r.status))) invalidAdminResponse();return {id:adminId(r.id),reason:adminString(r.reason),status:adminString(r.status),createdAt:timestamp(r.createdAt)};});
    if(orders.length>30||reports.length>30)invalidAdminResponse();return {orders,reports};})();
  return {
    facts,
    queues,
    warnings,
    ranks,
    interpretation,
    tracking,
    period: adminString(row.period),
    start: timestamp(row.start),
    end: timestamp(row.end),
    generatedAt: timestamp(row.generatedAt),
    aiError: row.aiError === null ? null : adminString(row.aiError)
  };
}
export type InsightReport = ReturnType<typeof insightReport>;
