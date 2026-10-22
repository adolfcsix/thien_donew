# Function inventory — A83 audit round 1

Static AST inventory, not runtime acceptance.

- routes: 82
- sourceModules: 348
- jsxModules: 220
- interactionCandidates: 2006
- runtimeInteractionsVerified: 0

Full interaction IDs, handler expressions, state hooks, local dependency graph, API candidates and layout references: `docs/current/function-inventory.json`. Backend controller/service/module table hints: `docs/current/endpoint-matrix.json`. Roles and table links remain NOT VERIFIED until service-level and database tests are traced.

| Route | Component | Reachable JSX modules | Control candidates | Status |
|---|---|---:|---:|---|
| / | apps/web/src/app/page.tsx | 2 | 15 | NOT TESTED |
| /academy | apps/web/src/app/academy/page.tsx | 2 | 3 | NOT TESTED |
| /academy/[slug] | apps/web/src/app/academy/[slug]/page.tsx | 3 | 13 | NOT TESTED |
| /admin | apps/web/src/app/admin/page.tsx | 21 | 182 | NOT TESTED |
| /admin/access | apps/web/src/app/admin/access/page.tsx | 10 | 75 | NOT TESTED |
| /admin/articles | apps/web/src/app/admin/articles/page.tsx | 0 | 0 | NOT TESTED |
| /admin/audit | apps/web/src/app/admin/audit/page.tsx | 0 | 0 | NOT TESTED |
| /admin/authority | apps/web/src/app/admin/authority/page.tsx | 11 | 76 | NOT TESTED |
| /admin/books | apps/web/src/app/admin/books/page.tsx | 11 | 107 | NOT TESTED |
| /admin/community | apps/web/src/app/admin/community/page.tsx | 10 | 76 | NOT TESTED |
| /admin/finance | apps/web/src/app/admin/finance/page.tsx | 9 | 95 | NOT TESTED |
| /admin/forum | apps/web/src/app/admin/forum/page.tsx | 10 | 91 | NOT TESTED |
| /admin/huong-dan | apps/web/src/app/admin/huong-dan/page.tsx | 10 | 87 | NOT TESTED |
| /admin/huyen-giai | apps/web/src/app/admin/huyen-giai/page.tsx | 9 | 84 | NOT TESTED |
| /admin/members | apps/web/src/app/admin/members/page.tsx | 0 | 0 | NOT TESTED |
| /admin/messages | apps/web/src/app/admin/messages/page.tsx | 14 | 56 | NOT TESTED |
| /admin/profile | apps/web/src/app/admin/profile/page.tsx | 0 | 0 | NOT TESTED |
| /admin/team | apps/web/src/app/admin/team/page.tsx | 19 | 121 | NOT TESTED |
| /admin/tinh-canh | apps/web/src/app/admin/tinh-canh/page.tsx | 14 | 98 | NOT TESTED |
| /admin/tro-ly | apps/web/src/app/admin/tro-ly/page.tsx | 11 | 93 | NOT TESTED |
| /admin/van-kho | apps/web/src/app/admin/van-kho/page.tsx | 11 | 114 | NOT TESTED |
| /articles | apps/web/src/app/articles/page.tsx | 4 | 41 | NOT TESTED |
| /bazi | apps/web/src/app/bazi/page.tsx | 8 | 64 | NOT TESTED |
| /birth-profiles | apps/web/src/app/birth-profiles/page.tsx | 4 | 73 | NOT TESTED |
| /books | apps/web/src/app/books/page.tsx | 1 | 13 | NOT TESTED |
| /books/[slug] | apps/web/src/app/books/[slug]/page.tsx | 4 | 44 | NOT TESTED |
| /books/[slug]/read | apps/web/src/app/books/[slug]/read/page.tsx | 4 | 48 | NOT TESTED |
| /books/contribute | apps/web/src/app/books/contribute/page.tsx | 6 | 70 | NOT TESTED |
| /calendar | apps/web/src/app/calendar/page.tsx | 7 | 73 | NOT TESTED |
| /chart | apps/web/src/app/chart/page.tsx | 8 | 69 | NOT TESTED |
| /chinh-sach-thanh-toan | apps/web/src/app/chinh-sach-thanh-toan/page.tsx | 1 | 3 | NOT TESTED |
| /collection | apps/web/src/app/collection/page.tsx | 4 | 45 | NOT TESTED |
| /consultation | apps/web/src/app/consultation/page.tsx | 1 | 19 | NOT TESTED |
| /dai-luc-nham | apps/web/src/app/dai-luc-nham/page.tsx | 9 | 76 | NOT TESTED |
| /forum | apps/web/src/app/forum/page.tsx | 11 | 50 | NOT TESTED |
| /forum/[id] | apps/web/src/app/forum/[id]/page.tsx | 11 | 67 | NOT TESTED |
| /forum/me | apps/web/src/app/forum/me/page.tsx | 1 | 8 | NOT TESTED |
| /forum/members/[id] | apps/web/src/app/forum/members/[id]/page.tsx | 11 | 41 | NOT TESTED |
| /forum/new | apps/web/src/app/forum/new/page.tsx | 5 | 63 | NOT TESTED |
| /good-days | apps/web/src/app/good-days/page.tsx | 2 | 24 | NOT TESTED |
| /ha-lac | apps/web/src/app/ha-lac/page.tsx | 7 | 72 | NOT TESTED |
| /ho-tro | apps/web/src/app/ho-tro/page.tsx | 1 | 4 | NOT TESTED |
| /huong-dan | apps/web/src/app/huong-dan/page.tsx | 2 | 11 | NOT TESTED |
| /huong-dan/[slug] | apps/web/src/app/huong-dan/[slug]/page.tsx | 3 | 12 | NOT TESTED |
| /huyen-giai | apps/web/src/app/huyen-giai/page.tsx | 6 | 67 | NOT TESTED |
| /huyen-hoc | apps/web/src/app/huyen-hoc/page.tsx | 1 | 18 | NOT TESTED |
| /iching | apps/web/src/app/iching/page.tsx | 4 | 22 | NOT TESTED |
| /ky-mon | apps/web/src/app/ky-mon/page.tsx | 16 | 118 | NOT TESTED |
| /ky-mon/depth | apps/web/src/app/ky-mon/depth/page.tsx | 6 | 80 | NOT TESTED |
| /library | apps/web/src/app/library/page.tsx | 1 | 7 | NOT TESTED |
| /login | apps/web/src/app/login/page.tsx | 4 | 43 | NOT TESTED |
| /luc-hao | apps/web/src/app/luc-hao/page.tsx | 13 | 123 | NOT TESTED |
| /mai-hoa | apps/web/src/app/mai-hoa/page.tsx | 12 | 123 | NOT TESTED |
| /membership | apps/web/src/app/membership/page.tsx | 2 | 9 | NOT TESTED |
| /messages | apps/web/src/app/messages/page.tsx | 14 | 56 | NOT TESTED |
| /ngu-hanh | apps/web/src/app/ngu-hanh/page.tsx | 3 | 9 | NOT TESTED |
| /numerology | apps/web/src/app/numerology/page.tsx | 7 | 62 | NOT TESTED |
| /phap-ly | apps/web/src/app/phap-ly/page.tsx | 2 | 11 | NOT TESTED |
| /phap-ly/[slug] | apps/web/src/app/phap-ly/[slug]/page.tsx | 3 | 12 | NOT TESTED |
| /phong-thuy | apps/web/src/app/phong-thuy/page.tsx | 11 | 82 | NOT TESTED |
| /pro/research | apps/web/src/app/pro/research/page.tsx | 5 | 47 | NOT TESTED |
| /research | apps/web/src/app/research/page.tsx | 3 | 28 | NOT TESTED |
| /research/advanced | apps/web/src/app/research/advanced/page.tsx | 5 | 41 | NOT TESTED |
| /research/development | apps/web/src/app/research/development/page.tsx | 2 | 9 | NOT TESTED |
| /research/examples | apps/web/src/app/research/examples/page.tsx | 1 | 13 | NOT TESTED |
| /research/luu-nien-van-tinh | apps/web/src/app/research/luu-nien-van-tinh/page.tsx | 1 | 4 | NOT TESTED |
| /research/schools | apps/web/src/app/research/schools/page.tsx | 1 | 8 | NOT TESTED |
| /research/star-audit | apps/web/src/app/research/star-audit/page.tsx | 1 | 21 | NOT TESTED |
| /research/star-system | apps/web/src/app/research/star-system/page.tsx | 3 | 20 | NOT TESTED |
| /star-atlas | apps/web/src/app/star-atlas/page.tsx | 2 | 27 | NOT TESTED |
| /study | apps/web/src/app/study/page.tsx | 4 | 79 | NOT TESTED |
| /study/compare | apps/web/src/app/study/compare/page.tsx | 4 | 43 | NOT TESTED |
| /tarot | apps/web/src/app/tarot/page.tsx | 12 | 109 | NOT TESTED |
| /thai-at | apps/web/src/app/thai-at/page.tsx | 9 | 65 | NOT TESTED |
| /thiet-ban | apps/web/src/app/thiet-ban/page.tsx | 7 | 93 | NOT TESTED |
| /tinh-canh | apps/web/src/app/tinh-canh/page.tsx | 8 | 56 | NOT TESTED |
| /van-kho | apps/web/src/app/van-kho/page.tsx | 1 | 9 | NOT TESTED |
| /van-kho/[slug] | apps/web/src/app/van-kho/[slug]/page.tsx | 2 | 6 | NOT TESTED |
| /van-kho/authors/[id] | apps/web/src/app/van-kho/authors/[id]/page.tsx | 1 | 2 | NOT TESTED |
| /western-astrology | apps/web/src/app/western-astrology/page.tsx | 13 | 121 | NOT TESTED |
| /western-astrology/relationship | apps/web/src/app/western-astrology/relationship/page.tsx | 9 | 116 | NOT TESTED |
| /western-symbols | apps/web/src/app/western-symbols/page.tsx | 2 | 12 | NOT TESTED |

## Kiểm chứng runtime vòng 2

Đã có 89 nhóm Chromium tài khoản, 22 nhóm Chromium AI, 26 test React DOM và 30 request HTTP qua 16 endpoint. Chi tiết và một control ID được nối tới bằng chứng thực tế ở `docs/current/runtime-coverage.json`. Đây là các kịch bản có chọn lọc, không biến mọi dòng NOT TESTED trong kiểm kê tĩnh thành PASS. Trường runtimeInteractionsVerified=0 của bộ sinh tĩnh là số control được nghiệm thu đầy đủ 20 tiêu chí trong chính bộ sinh đó; không phải số thao tác đã chạy trong các harness riêng.
