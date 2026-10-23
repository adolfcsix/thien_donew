/**
 * Read-only HTTP routes that must work in the real built Next.js application.
 * Intentionally not used as an offline-only assertion: next-proxy-smoke imports
 * this manifest and fetches each route through the running Next server.
 * Keep these checks independent of authentication or mutating test accounts.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const lessonsUrl = new URL('../../apps/web/src/features/academy/lessons.json', import.meta.url);

export function buildReadOnlyRouteManifest(lessons) {
  if (!Array.isArray(lessons) || !lessons.length) throw Error('Academy lesson list is missing');
  const slugs = new Set();
  const routes = [
    {path:'/', marker:'Một thư phòng.'},
    {path:'/chart', marker:'THIÊN ĐỒ'},
    {path:'/calendar', marker:'Lịch'},
    {path:'/good-days', marker:'ngày'},
    // The account gate renders first on SSR; the calculator is checked after login in account.browser.cjs.
    {path:'/bazi', marker:'Đang kiểm tra tài khoản…', authenticatedMarker:'Tứ trụ, bốn dấu mốc thời gian'},
    {path:'/academy', marker:'Từ đọc địa bàn'},
    {path:'/library', marker:'Từ điển huyền học'},
    {path:'/star-atlas', marker:'chính tinh'},
  ];
  for (const item of lessons) {
    if (!item || typeof item.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) ||
        typeof item.title !== 'string' || item.title.length < 3) {
      throw Error('Invalid academy lesson slug or title in read-only HTTP manifest');
    }
    if (slugs.has(item.slug)) throw Error(`Duplicate academy lesson slug: ${item.slug}`);
    slugs.add(item.slug);
    routes.push({path:`/academy/${item.slug}`, marker:item.title});
  }
  return routes;
}

export function getReadOnlyRouteManifest() {
  const content = JSON.parse(readFileSync(lessonsUrl,'utf8'));
  return buildReadOnlyRouteManifest(content);
}

// No network activity or database operations in this module.
