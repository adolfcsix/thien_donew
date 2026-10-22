import {PageViewRecorder} from '@/components/page-view-recorder';
import type { Metadata, Viewport } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';
import './layout.css';
import './home.css';
import './chart.css';
import './chart-birth-review.css';
import './chart-explorer.css';
import './chart-atlas.css';
import './palace-insight-dock.css';
import './twelve-palace-ledger.css';
import './palace-study-workbench.css';
import './palace-research.css';
import './traceable-findings.css';
import './calendar.css';
import './good-days.css';
import './bazi.css';
import './auth.css';
import './responsive.css';
// View-mode presentation lives in a CSS module; the shared mode state lives in Shell.
import './ux-refinement.css';
import './interface-quality.css';
import './typography-refinement.css';
import './chart-heritage.css';
import './chart-fit.css';
import './palace-reader.css';
import './chart-readability.css';
import './chart-advanced-stars.css';
import './palace-reading.css';
import './period-timeline.css';
import './temporal-detail.css';
import './bazi-depth.css';
import './good-days-depth.css';
import './responsive-polish.css';
import './experience.css';
import './period-reading-v111495.css';
import './ux-v11162.css';
import './portal-v11163.css';
import '../customize/home.css';
// V11.164.17: shared design foundation is intentionally last to resolve legacy style conflicts.
import './design-foundation-v1116417.css';
// V11.164.18: photographic study atmosphere + restrained East-Asian navigation ornament.
import './study-atmosphere-v1116418.css';
// The global material below supersedes the old route-only liquid layer.
// V11.164.18.2: one global visual layer for every route (density controlled per page).
import './global-visual-harmony-v11164182.css';
// V11.164.18.3: approved Thiên Môn logo and dimensional navigation.
import './thien-mon-brand-v11164183.css';
// V11.164.18.4: exact approved sky-gate scenery and art-rich auth identity.
import './thien-mon-scenery-v11164184.css';
// Final shared accessibility layer; specialist data colors are preserved.
import './sitewide-contrast-safety.css';
// Stage 2: consistent shared glass controls and accessible motion on every route.
import './sitewide-material-motion-stage2.css';
// Stage 3: restrained, sitewide navigation glass/motion with accessible fallbacks.
import './sitewide-motion-stage3.css';
// Stage 4: contrast-safe shared overlays and keyboard controls.
import './sitewide-readability-stage4.css';
// Stage 5: synchronize account overlays outside .site and shared keyboard focus.
import './sitewide-theme-synchrony-stage5.css';
import '../features/chart/styles/chart-experience.css';
// Bounded route themes: the main Thiên Đồ presentation remains the default.
import './western-worlds.css';
import './account-layout-stability.css';
import './admin-workspace-shell.css';
import './community-and-chart-refinement.css';
import './forum-chat-polish-a62.css';
import './local-fonts.css';
// Dedicated ornamental skin for the Tử Vi board; isolated from global chart data styles.
import '../features/chart/styles/chart-jade-material.css';
// Keep staging/private previews out of search, but allow explicit public indexing
// only when an operator opts in on a production build.
const allowIndexing = process.env.NODE_ENV === 'production' && process.env.ENABLE_SEARCH_INDEXING === 'true';
export const metadata: Metadata = { title: { default: 'THIÊN ĐỒ — Thư phòng huyền học', template: '%s · THIÊN ĐỒ' }, description: 'Khám phá huyền học Đông và Tây, thực hành từng bộ môn và lưu nghiên cứu trong thư phòng cá nhân.', robots: { index: allowIndexing, follow: allowIndexing } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#173F36' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="vi"><body><PageViewRecorder/><Shell>{children}</Shell></body></html>; }
