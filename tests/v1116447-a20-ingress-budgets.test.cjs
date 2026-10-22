'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const root=join(__dirname,'..');
const nginx=readFileSync(join(root,'infrastructure/production/nginx.conf'),'utf8');
const proxy=readFileSync(join(root,'infrastructure/production/proxy-api.conf'),'utf8');
const api=readFileSync(join(root,'apps/api/src/main.ts'),'utf8');
const books=readFileSync(join(root,'apps/api/src/modules/books/books.service.ts'),'utf8');
const media=readFileSync(join(root,'apps/api/src/modules/van-kho/van-kho-media-contract.cjs'),'utf8');
function bodyBudget(location) {
 const escaped=location.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const m=nginx.match(new RegExp('location\\s+'+escaped+'\\s*\\{([^{}]*)\\}'));
 assert.ok(m,'Missing ingress route: '+location);
 assert.match(m[1],/include \/etc\/nginx\/proxy-api\.conf;/,'Route must proxy to authenticated API');
 const budget=m[1].match(/client_max_body_size\s+(\d+[km]);/);
 assert.ok(budget,'Missing body budget for '+location);
 return budget[1];
}
const exact=[
 ['/api/study/import','2m'],['/api/auth/avatar','300k'],
 ['/api/van-kho/admin/documents','256k'],
];
const regex=[
 ['^/api/van-kho/admin/documents/[^/]+$','256k'],
 ['^/api/van-kho/admin/documents/[^/]+/images/(?:jpeg|png|webp)$','5m'],
 ['^/api/books/admin/[^/]+/assets/book/(?:pdf|epub)$','24m'],
 ['^/api/books/admin/[^/]+/assets/cover/(?:jpeg|png|webp)$','5m'],
];
test('A20 global Nginx ingress budget remains 80 KiB, not 24 MiB for every route',()=>{
 assert.match(nginx,/server\s*\{[\s\S]*?client_max_body_size\s+80k;/);
 assert.match(nginx,/limit_req zone=per_ip/);
 assert.match(nginx,/limit_req zone=global_api/);
});
for(const [location,budget] of exact) test(`A20 exact route ${location} permits ${budget}`,()=>assert.equal(bodyBudget('= '+location),budget));
for(const [location,budget] of regex) test(`A20 anchored route ${location} permits ${budget}`,()=>{
 assert.equal(bodyBudget('~ '+location),budget);
 // A matching path must be fully anchored; no catch-all CMS or uploads.
 assert.ok(location.startsWith('^')&&location.endsWith('$'));
});
test('A20 proxy timeout is not duplicated by study import block',()=>{
 assert.match(proxy, /proxy_read_timeout\s+30s;/);
 const directives=nginx.split('\n').filter(line => /^\s*proxy_read_timeout\s+/.test(line));
 assert.equal(directives.length,0);
});
test('A20 ingress budgets agree with NestJS and streaming upload limits',()=>{
 assert.match(api,/json\(\{ limit: '256kb' \}\)/);
 assert.match(api,/json\(\{ limit: '2mb' \}\)/);
 assert.match(api,/raw\(\{ type: \['image\/jpeg','image\/png','image\/webp'\], limit:'300kb'/);
 assert.match(books,/MAX_BYTES=24\*1024\*1024/);
 assert.match(media,/LIMIT=5\*1024\*1024/);
});
