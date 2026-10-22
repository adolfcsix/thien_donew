#!/usr/bin/env node
'use strict';
// Internal consistency check; this is NOT a professional review of divination rules.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = require('../../packages/knowledge/src/capability-registry.json');
const allowedStatuses = new Set(['source-implemented', 'internal-partial', 'not-implemented']);
const allowedAreas = new Set(['core', 'support', 'knowledge', 'product', 'future-engine']);
const errors = [];
const identifiers = new Set();
const routes = new Set();
const validRoute = route => /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(route);
const safePath = value => typeof value === 'string' && value !== '' && !path.isAbsolute(value) &&
  !value.split(/[\\/]/).includes('..') && !value.includes('\\') && !value.startsWith('.');
if (!Array.isArray(source.modules) || !source.modules.length) errors.push('modules must be a non-empty array');
for (const m of source.modules || []) {
  const label = typeof m?.id === 'string' ? m.id : '<id missing>';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label)) errors.push(`${label}: invalid ID`);
  if (identifiers.has(label)) errors.push(`${label}: duplicate ID`);
  identifiers.add(label);
  if (!allowedStatuses.has(m.status)) errors.push(`${label}: unsupported status`);
  if (!allowedAreas.has(m.area)) errors.push(`${label}: unsupported area`);
  if (!m.name || typeof m.name !== 'string') errors.push(`${label}: missing name`);
  if (typeof m.nextGap !== 'string' || m.nextGap.length < 20) errors.push(`${label}: specify a concrete limitation`);
  if (typeof m.referenceMenuObserved !== 'boolean') errors.push(`${label}: reference observation must be boolean`);
  if (!Array.isArray(m.evidencePaths)) {errors.push(`${label}: evidencePaths must be array`);continue;}
  if (m.status === 'not-implemented' && (m.route !== null || m.evidencePaths.length))
    errors.push(`${label}: not-implemented must have neither route nor claimed code evidence`);
  if (m.status === 'internal-partial' && (m.route !== null || !m.evidencePaths.length))
    errors.push(`${label}: partial module must have no public route and evidence`);
  if (m.status === 'source-implemented' && (!m.route || !m.evidencePaths.length))
    errors.push(`${label}: source-implemented requires route and code evidence`);
  if (m.route !== null) {
    if (typeof m.route !== 'string' || !validRoute(m.route)) errors.push(`${label}: invalid route`);
    else {
      if (routes.has(m.route)) errors.push(`${label}: duplicate route ${m.route}`);
      routes.add(m.route);
      if (!fs.existsSync(path.join(root, 'apps/web/src/app', m.route.substring(1), 'page.tsx')))
        errors.push(`${label}: route ${m.route} has no Next.js page`);
    }
  }
  const seenFiles = new Set();
  for (const rel of m.evidencePaths) {
    if (!safePath(rel)) {errors.push(`${label}: unsafe evidence path`);continue;}
    if (seenFiles.has(rel)) errors.push(`${label}: duplicate evidence entry ${rel}`);
    seenFiles.add(rel);
    if (!fs.statSync(root,{throwIfNoEntry:false})) {errors.push('missing repository');break;}
    const target = path.resolve(root, rel);
    if (!target.startsWith(root+path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile())
      errors.push(`${label}: missing evidence file ${rel}`);
  }
  if (m.status === 'source-implemented' && !m.evidencePaths.includes(`apps/web/src/app${m.route}/page.tsx`))
    errors.push(`${label}: implemented route should be explicit in evidencePaths`);
}
const counts = Object.fromEntries([...allowedStatuses].map(key=>[key,source.modules.filter(m=>m.status===key).length]));
const summary = {
  schemaVersion: source.schemaVersion,
  release: source.release,
  assessedAt: '2026-10-11',
  check: 'static-source-only',
  moduleCount: source.modules.length,
  counts,
  referenceObserved: source.modules.filter(m=>m.referenceMenuObserved).length,
  evidenceFileRefs: source.modules.reduce((n,m)=>n+m.evidencePaths.length,0),
  errors,
  limitations: [
    'An existing route or module is not proof of an operational production deployment.',
    'No independent ephemeris, school-rule or expert validation is asserted.',
    'Reference menu observation comes from user screenshot; backend completeness is unknown.',
    'Internal analysis is not public source attribution in website UI.',
  ],
  modules: source.modules.map(({id,name,area,status,route,evidencePaths,referenceMenuObserved,nextGap})=>({id,name,area,status,route,evidencePaths,referenceMenuObserved,nextGap})),
};
function renderMarkdown() {
  const lines = [
    `# Thiên Đồ ${source.release} — Kiểm kê năng lực có chứng cứ`,
    '',
    '> Báo cáo nội bộ dành cho phát triển. Không công khai như lời hứa tính năng hay kết luận chuyên môn.',
    '',
    `- Tổng số hạng mục: **${summary.moduleCount}**`,
    `- Có route + bằng chứng source: **${counts['source-implemented']}**`,
    `- Có logic nội bộ nhưng chưa có trang riêng: **${counts['internal-partial']}**`,
    `- Chưa triển khai: **${counts['not-implemented']}**`,
    `- Số hạng mục được nhìn thấy trong ảnh/menu mẫu: **${summary.referenceObserved}**`,
    `- Vấn đề schema/path: **${errors.length}**`, '',
    '| Hạng mục | Trạng thái | Route | Ghi chú / điểm thiếu |', '|---|---|---|---|',
    ...source.modules.map(m=>`| ${m.name} | ${m.status} | ${m.route || '—'} | ${m.nextGap.replaceAll('|','/')} |`),
    '', '## Nguyên tắc',
    '- Route code tồn tại chưa khẳng định chạy được trên production hoặc đã thẩm định thuật số.',
    '- Giao diện mới chỉ tạo khi có engine và fixture kiểm chứng; không đặt nút rỗng.',
    '- Mục không triển khai có `route: null`, `evidencePaths: []`.',
    '- Dữ liệu sao, lịch pháp và phân tích được theo dõi riêng, không tính thành số lượng module hoàn chỉnh.',
    '- Website mẫu là điểm tham chiếu phạm vi, không phải kho văn bản để sao chép.',
    '', '## Lỗi kiểm toán', ...(errors.length?errors.map(e=>`- ${e}`):['- Không phát hiện vấn đề cấu trúc ở lần kiểm toán tĩnh này.']), '',
  ];
  return lines.join('\n');
}
if (process.argv.includes('--write')) {
  const out = path.join(root,'docs/reports');
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'V11_29_CAPABILITY_AUDIT.json'),JSON.stringify(summary,null,2)+'\n');
  fs.writeFileSync(path.join(out,'V11_29_CAPABILITY_AUDIT.md'),renderMarkdown());
}
console.log(`Thiên Đồ ${source.release}: ${summary.moduleCount} modules; implemented=${counts['source-implemented']}; partial=${counts['internal-partial']}; missing=${counts['not-implemented']}; errors=${errors.length}`);
if (errors.length) {for(const msg of errors) console.error(' - '+msg); process.exitCode=1;}
module.exports={audit:summary, renderMarkdown};
