'use client';

import Link from 'next/link';
import {PremiumLock} from '@/features/community-hub/premium';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth-provider';
import { navigationShortcuts, navigationGroups, findNavigationGroup, navigationCategory, navigationPageTitle, searchNavigation } from '@/lib/navigation';
import navStyles from './navigation-tree.module.css';
import { getDisciplinePresentation } from '@/lib/discipline-presentation';
import { ReadableTables } from './readable-tables';
import {ViewModeProvider, useViewMode} from './view-mode';
import {ToolAccessGate} from './tool-access-gate';
import {AdminNavLink} from './admin-nav-link';
import {getWesternWorld} from '@/lib/western-worlds';
import {resolveThemePreference} from '@/lib/theme-preference';
import {NavigationSymbol,TianMark} from './navigation-symbol';

const STORAGE_RAIL = 'thiendo-navigation-compact';
const STORAGE_THEME = 'thiendo-theme';
const STORAGE_NAV_GROUPS = 'thiendo-navigation-groups';
const mobileLinks = [
  {href: '/', symbol: '⌂', text: 'Trang chủ'},
  {href: '/huyen-hoc', symbol: '◈', text: 'Bộ môn'},
  {href: '/study', symbol: '✎', text: 'Thư phòng'},
  {href: '/forum', symbol: '☷', text: 'Luận Đàn'},
];

export function Shell({ children }: { children: ReactNode }) {
  return <AuthProvider><ViewModeProvider><Layout>{children}</Layout></ViewModeProvider></AuthProvider>;
}

function Layout({ children }: { children: ReactNode }) {
  const route = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [compact, setCompact] = useState(false);
  const [tooltip, setTooltip] = useState<{label:string;top:number;left:number}|null>(null);
  const discipline = getDisciplinePresentation(route);
  const westernWorld = getWesternWorld(route);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const currentGroup = findNavigationGroup(route);
    return currentGroup ? [currentGroup.id] : [];
  });
  const [navigationReady, setNavigationReady] = useState(false);
  const {mode: viewMode, setMode: setViewMode} = useViewMode();
  const expert = viewMode === 'expert';
  const [light, setLight] = useState(false);
  // Global brightness, local artwork: switching between the five Western worlds
  // must never change a visitor's chosen light/dark mode.
  const resolvedLight = light;
  function toggleTheme() { setLight(value => !value); }
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeResult, setActiveResult] = useState(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const lastRoute = useRef(route);
  const lastOverlay = useRef<{kind: 'menu' | 'search'; route: string; trigger: HTMLElement | null} | null>(null);
  const { user, open, avatarRevision } = useAuth();
  const current = navigationPageTitle(route);
  const matches = useMemo(() => searchNavigation(query), [query]);

  // Initial render is stable for SSR; user preferences are restored only after hydration.
  useLayoutEffect(() => {
    let savedTheme: string | null = null;
    try {
      setCompact(localStorage.getItem(STORAGE_RAIL) === 'true');
      savedTheme = localStorage.getItem(STORAGE_THEME);
    } catch { /* Private browsing may disable storage; system preference still applies. */ }
    setLight(resolveThemePreference(savedTheme, window.matchMedia('(prefers-color-scheme: light)').matches));
    const device = navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean}};
    document.documentElement.dataset.thiendoEffects = device.connection?.saveData || (device.deviceMemory !== undefined && device.deviceMemory <= 4) ? 'reduced' : 'full';
    setPreferencesReady(true);
  }, []);

  // Synchronize brightness with other open tabs (and when a suspended tab is
  // reactivated). The five Western worlds keep their artwork, but never own
  // separate light/dark state. This effect must not write to localStorage:
  // the persistence effect below is the single writer.
  useEffect(() => {
    if (!preferencesReady) return;
    const readStoredBrightness = () => {
      let stored: string | null = null;
      try { stored = localStorage.getItem(STORAGE_THEME); }
      catch {
        // Initialization already applied the OS fallback. A later read failure
        // must preserve the user's in-memory choice instead of resetting it
        // whenever a suspended/private tab becomes visible again.
        return;
      }
      setLight(resolveThemePreference(stored, window.matchMedia('(prefers-color-scheme: light)').matches));
    };
    const onStorage = (event: StorageEvent) => {
      // localStorage may be inaccessible in private mode; filtering on key
      // avoids dereferencing it outside the guarded read above.
      if (event.key === STORAGE_THEME || event.key === null) readStoredBrightness();
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') readStoredBrightness(); };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [preferencesReady]);

  // Brightness is a user preference. Entering/leaving a Western world must
  // never re-run the palette fence, write storage or cancel live transitions.
  // This keeps route-only changes independent from the global brightness toggle.
  useLayoutEffect(() => {
    if (!preferencesReady) return;
    const root = document.documentElement;
    root.dataset.thiendoThemeChanging = 'true';
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => { delete root.dataset.thiendoThemeChanging; }); });
    try { localStorage.setItem(STORAGE_THEME, light ? 'light' : 'dark'); } catch { /* Nonessential preference. */ }
    // The account dialog is a sibling of .site inside AuthProvider.
    document.documentElement.dataset.thiendoTheme = resolvedLight ? 'light' : 'dark';
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); delete root.dataset.thiendoThemeChanging; };
  }, [light, resolvedLight, preferencesReady]);

  // World artwork changes alongside the route, without pretending that the
  // visitor toggled light/dark. The logo remains the same global brand.
  useLayoutEffect(() => {
    if (westernWorld) document.documentElement.dataset.westernWorld = westernWorld.id;
    else delete document.documentElement.dataset.westernWorld;
  }, [westernWorld?.id]);

  // Remember chosen branches between visits, but always reveal the current route.
  useEffect(() => {
    let stored: string[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_NAV_GROUPS) || '[]');
      if (Array.isArray(parsed)) {
        stored = parsed.filter((id): id is string => typeof id === 'string' && navigationGroups.some(group => group.id === id));
      }
    } catch { /* Local storage is optional. */ }
    const active = findNavigationGroup(route)?.id;
    setExpandedGroups(Array.from(new Set([...stored, ...(active ? [active] : [])])));
    setNavigationReady(true);
  }, []);

  useEffect(() => {
    if (!navigationReady) return;
    try { localStorage.setItem(STORAGE_NAV_GROUPS, JSON.stringify(expandedGroups)); }
    catch { /* Nonessential preference. */ }
  }, [expandedGroups, navigationReady]);

  useEffect(() => {
    const currentGroup = findNavigationGroup(route)?.id;
    if (currentGroup) setExpandedGroups(groups => groups.includes(currentGroup) ? groups : [...groups, currentGroup]);
  }, [route]);

  function toggleNavigationGroup(groupId: string) {
    setExpandedGroups(groups => groups.includes(groupId) ? groups.filter(id => id !== groupId) : [...groups, groupId]);
  }

  useEffect(() => {
    setMenu(false);
    setSearchOpen(false);
    // Announce client-side route changes to keyboard and screen-reader users.
    // Do not steal focus during the initial page hydration.
    if (lastRoute.current !== route) {
      lastRoute.current = route;
      const frame = requestAnimationFrame(() => document.getElementById('main-content')?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [route]);

  useEffect(() => {
    if (menu) document.querySelector<HTMLElement>('#thiendo-sidebar nav a[href]')?.focus();
  }, [menu]);

  useEffect(() => {
    const previous = lastOverlay.current;
    if (menu || searchOpen) {
      if (!previous || previous.kind !== (searchOpen ? 'search' : 'menu')) {
        const active = document.activeElement;
        lastOverlay.current = {kind: searchOpen ? 'search' : 'menu', route, trigger: active instanceof HTMLElement && !active.closest('#thiendo-sidebar, .command-panel') ? active : null};
      }
      return;
    }
    lastOverlay.current = null;
    if (!previous || previous.route !== route) return;
    // Wait until the background is no longer inert before returning focus.
    const frame = requestAnimationFrame(() => (previous.trigger || (previous.kind === 'search' ? searchTrigger.current : menuTrigger.current))?.focus());
    return () => cancelAnimationFrame(frame);
  }, [menu, searchOpen, route]);

  useEffect(() => {
    if (searchOpen) document.getElementById(`tool-option-${activeResult}`)?.scrollIntoView({block: 'nearest'});
  }, [activeResult, searchOpen]);

  useEffect(() => {
    // An open mobile drawer should never keep the desktop page scroll-locked
    // after an orientation change or browser resize.
    const mobile = window.matchMedia('(max-width: 970px)');
    const onResize = () => { setNarrow(mobile.matches); if (!mobile.matches) setMenu(false); };
    onResize();
    mobile.addEventListener('change', onResize);
    return () => mobile.removeEventListener('change', onResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if(route==='/admin'||route.startsWith('/admin/'))return;
      const element = event.target as HTMLElement | null;
      const typing = element?.matches('input, textarea, select, [contenteditable="true"]');
      const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (!searchOpen && document.querySelector('.modal-backdrop')) return;
      if (shortcut || (event.key === '/' && !typing && !event.altKey && !event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        setMenu(false);
        setSearchOpen(true);
      } else if (event.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); searchTrigger.current?.focus(); }
        else if (menu) { setMenu(false); menuTrigger.current?.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menu, searchOpen, route]);

  useEffect(() => {
    if (!searchOpen) { setQuery(''); setActiveResult(0); return; }
    searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!menu && !searchOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [menu, searchOpen]);

  function toggleCompact() {
    setTooltip(null);
    setCompact(value => {const next=!value;try {localStorage.setItem(STORAGE_RAIL,String(next));} catch {}return next;});
  }
  function showRailTooltip(target: EventTarget | null) {
    if (!compact || narrow || !(target instanceof Element)) return;
    const element=target.closest<HTMLElement>('a[title],button[title]');
    if(!element) {setTooltip(null);return;}
    const rect=element.getBoundingClientRect();
    const next = {label:element.title,left:rect.right+12,top:Math.max(8,Math.min(window.innerHeight-50,rect.top))};
    // Mouseover bubbles through icon/span children. Repeated events over the
    // same link must not rerender the entire shell for an unchanged tooltip.
    setTooltip(current => current?.label===next.label && current.left===next.left && current.top===next.top ? current : next);
  }

  function closeSearch() { setSearchOpen(false); searchTrigger.current?.focus(); }
  function selectResult(href: string) { setSearchOpen(false); setQuery(''); router.push(href); }
  function searchKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveResult(i => Math.min(i + 1, Math.max(0, matches.length - 1))); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveResult(i => Math.max(0, i - 1)); }
    else if (event.key === 'Enter' && matches.length) { event.preventDefault(); selectResult(matches[Math.min(activeResult, matches.length - 1)].href); }
  }

  // Decorative workspaces share one presentation contract, without changing tool routing.
  const visualSpace = route === '/huyen-giai' ? 'ai' : route === '/study' || route.startsWith('/study/') ? 'study' : route === '/research' || route.startsWith('/research/') ? 'research' : undefined;
  // Visual density changes presentation only. No route logic, authorization or
  // specialist chart data is derived from this attribute.
  const dataDensePrefixes = ['/chart', '/bazi', '/ky-mon', '/luc-hao', '/dai-luc-nham',
    '/thai-at', '/thiet-ban', '/ha-lac', '/phong-thuy', '/calendar', '/good-days',
    '/mai-hoa', '/iching', '/western-astrology', '/numerology', '/ngu-hanh'];
  const readingPrefixes = ['/admin', '/forum', '/books', '/van-kho', '/academy',
    '/articles', '/library', '/huong-dan', '/phap-ly', '/membership', '/login',
    '/consultation', '/collection', '/birth-profiles', '/chinh-sach-thanh-toan',
    '/pro/research', '/ho-tro'];
  const inSection = (prefix: string) => route === prefix || route.startsWith(`${prefix}/`);
  const visualDensity = visualSpace ? 'immersive'
    : dataDensePrefixes.some(inSection) ? 'dense'
    : readingPrefixes.some(inSection) ? 'reading' : 'immersive';
  if(route==='/admin'||route.startsWith('/admin/'))return <div className={'site admin-site'+(resolvedLight?' light':'')} data-admin-root="true" data-theme-ready={preferencesReady}><main id="main-content" className="admin-root" tabIndex={-1}>{children}<ReadableTables/></main></div>;
  return <div className={'site' + (resolvedLight ? ' light' : '')} data-western-world={westernWorld?.id} data-visual-space={visualSpace} data-visual-density={visualDensity} data-navigation={compact ? 'compact' : 'full'} data-theme-ready={preferencesReady} data-discipline={discipline?.id || 'shared'} data-mode={expert ? 'expert' : 'basic'}>
    <a href="#main-content" className="skip-link">Bỏ qua điều hướng, đến nội dung chính</a>
    <aside onMouseOver={event=>showRailTooltip(event.target)} onMouseLeave={()=>setTooltip(null)} onFocusCapture={event=>showRailTooltip(event.target)} onBlurCapture={()=>setTooltip(null)} onScroll={()=>setTooltip(null)} id="thiendo-sidebar" className={'sidebar' + (menu ? ' show' : '')} aria-label="Thanh điều hướng" inert={searchOpen || (narrow && !menu)} role={narrow && menu ? 'dialog' : undefined} aria-modal={narrow && menu ? true : undefined} onKeyDown={event => {
      if (!menu || event.key !== 'Tab') return;
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
        .filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <Link prefetch={false} href="/" className="brand" onClick={() => setMenu(false)}><span className="brand-seal" aria-hidden="true"><span className="thien-mon-approved-icon" /></span><span><strong>THIÊN ĐỒ</strong><small>THƯ PHÒNG HUYỀN HỌC</small></span></Link>
      <button type="button" className="drawer-close" aria-label="Đóng điều hướng" onClick={() => { setMenu(false); menuTrigger.current?.focus(); }}>✕</button>
      <div className="nav-heading">{westernWorld ? westernWorld.label : 'THƯ PHÒNG CỦA BẠN'}</div>
      <nav className={navStyles.tree} aria-label="Điều hướng chính">
        <div className={navStyles.shortcuts}>
          {navigationShortcuts.map(item => <Link prefetch={false} key={item.href} href={item.href} title={item.text} onClick={() => setMenu(false)} aria-current={route === item.href ? 'page' : undefined} className={'nav-item' + (route === item.href ? ' active' : '')}>
            <span aria-hidden="true"><NavigationSymbol symbol={item.symbol} href={item.href}/></span>{item.text}
          </Link>)}
        </div>
        <div className={navStyles.sectionHeading}><span>CHUYÊN MỤC</span></div>
        {navigationGroups.filter(group=>group.id!=='huong-dan-ho-tro').map(group => {
          const expanded = expandedGroups.includes(group.id);
          const active = findNavigationGroup(route)?.id === group.id;
          return <section key={group.id} className={navStyles.group} data-active={active ? 'true' : 'false'}>
            <h2 className={navStyles.groupTitle}>
              <button type="button" className={navStyles.groupToggle} title={group.label} onClick={() => toggleNavigationGroup(group.id)} aria-expanded={expanded} aria-controls={`nav-group-${group.id}`}>
                <span className={navStyles.groupSymbol} aria-hidden="true"><NavigationSymbol symbol={group.symbol}/></span>
                <span className={navStyles.groupLabel}>{group.label}</span>
                <span className={navStyles.chevron} aria-hidden="true">⌄</span>
              </button>
            </h2>
            <div id={`nav-group-${group.id}`} className={navStyles.groupItems} hidden={!expanded}>
              {group.items.map(item => <Link prefetch={false} key={item.href} href={item.href} title={item.text} onClick={() => setMenu(false)} aria-current={route === item.href ? 'page' : undefined} className={'nav-item ' + navStyles.subItem + (route === item.href ? ' active' : '')}>
                <span aria-hidden="true"><NavigationSymbol symbol={item.symbol} href={item.href}/></span>{item.text}
              </Link>)}
            </div>
          </section>;
        })}
      </nav>
      <div className="nav-heading">THÀNH VIÊN</div>
      <Link prefetch={false} href="/consultation" title="Tư vấn riêng" className="nav-item" onClick={()=>setMenu(false)}><span aria-hidden="true">✧</span>Tư vấn riêng</Link>
      <Link prefetch={false} href="/membership" title="Thành viên &amp; Pro" className="nav-item" onClick={()=>setMenu(false)}><span aria-hidden="true">✧</span>Thành viên &amp; Pro</Link>
      <Link prefetch={false} href="/pro/research" title="Báo cáo nghiên cứu" className="nav-item" onClick={()=>setMenu(false)}><span aria-hidden="true">▤</span>Báo cáo nghiên cứu<PremiumLock href="/pro/research"/></Link>
      <Link prefetch={false} href="/forum" title="Thiên Đồ Luận Đàn" className="nav-item" onClick={()=>setMenu(false)}><span aria-hidden="true">☷</span>Thiên Đồ Luận Đàn</Link>
      <Link prefetch={false} href="/articles" title="Thiên Đồ Tạp Chí" className="nav-item" onClick={()=>setMenu(false)}><span aria-hidden="true">✎</span>Thiên Đồ Tạp Chí</Link>
      <Link prefetch={false} href="/messages" className="nav-item" onClick={()=>setMenu(false)}><span aria-hidden="true">✉</span>Tin nhắn riêng</Link>
      <Link prefetch={false} href="/research/advanced" className="nav-item" onClick={()=>setMenu(false)}><span aria-hidden="true">◇</span>Xưởng nghiên cứu<PremiumLock href="/research/advanced"/></Link>
      <AdminNavLink/>
      <nav className={navStyles.tree} aria-label="Hướng dẫn và hỗ trợ">{navigationGroups.filter(g=>g.id==='huong-dan-ho-tro').map(group=><section key={group.id} className={navStyles.group}><h2 className={navStyles.groupTitle}><button type="button" className={navStyles.groupToggle} onClick={()=>toggleNavigationGroup(group.id)} aria-expanded={expandedGroups.includes(group.id)} aria-controls={'nav-group-'+group.id}><span className={navStyles.groupSymbol} aria-hidden="true">文</span><span className={navStyles.groupLabel}>{group.label}</span><span className={navStyles.chevron}>⌄</span></button></h2><div id={'nav-group-'+group.id} className={navStyles.groupItems} hidden={!expandedGroups.includes(group.id)}>{group.items.map(item=><Link key={item.href} href={item.href} className={'nav-item '+navStyles.subItem} onClick={()=>setMenu(false)}><span aria-hidden="true">◇</span>{item.text}</Link>)}</div></section>)}</nav>
    </aside>
    {menu && <button type="button" aria-label="Đóng menu" className="nav-shade" onClick={() => { setMenu(false); menuTrigger.current?.focus(); }} />}
    <div className="app-area" inert={menu || searchOpen}>
      <header className="topbar">
        <div className="topbar-name"><button type="button" className="icon-button desktop-rail-toggle" onClick={toggleCompact} aria-label={compact?'Mở rộng thanh điều hướng':'Thu gọn thanh điều hướng'} aria-expanded={!compact} aria-controls="thiendo-sidebar" title={compact?'Mở rộng menu':'Thu gọn menu'}><span aria-hidden="true" className="rail-chevron">{compact ? '›' : '‹'}</span></button><button ref={menuTrigger} type="button" className="icon-button mobile-menu" aria-label={menu ? 'Đóng menu' : 'Mở menu'} aria-expanded={menu} aria-controls="thiendo-sidebar" onClick={() => setMenu(!menu)}>☰</button><span className="crumb">{discipline?.family || 'THƯ PHÒNG'} <span>/</span> <b>{current}</b></span></div>
        <div className="toolbar">
          <button ref={searchTrigger} type="button" className="quick-search-trigger" aria-label="Tìm nhanh trang và công cụ" title="Tìm công cụ" onClick={() => { setMenu(false); setSearchOpen(true); }}><span aria-hidden="true">⌕</span><span className="quick-search-label">Tìm công cụ</span></button>
          <div className="mode-switch" role="group" aria-label="Chế độ hiển thị"><button type="button" aria-pressed={!expert} className={!expert ? 'chosen' : ''} onClick={() => setViewMode('basic')}>Cơ bản</button><button type="button" aria-pressed={expert} className={expert ? 'chosen' : ''} onClick={() => setViewMode('expert')}>Chuyên sâu</button></div>
          <button type="button" className="icon-button theme-button" onClick={toggleTheme} title={resolvedLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'} aria-label={resolvedLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'} aria-pressed={resolvedLight}>{resolvedLight ? '☾' : '☀'}</button>
          <button type="button" className="avatar-button" onClick={() => open()} title={user?.email || 'Tài khoản'} aria-label="Mở tài khoản"><ShellAvatar userId={user?.id ?? null} displayName={user?.displayName || user?.email || ''} hasAvatar={Boolean(user?.hasAvatar)} avatarRevision={avatarRevision} /></button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="main-content"><ToolAccessGate>{children}</ToolAccessGate><ReadableTables /></main>
      <footer className="thiendo-legal-footer" aria-label="Chính sách và hỗ trợ"><div><strong>THIÊN ĐỒ</strong><span>Không phải phương tiện dự đoán chắc chắn. Chính sách hiện là dự thảo cho môi trường thử nghiệm.</span></div><nav aria-label="Liên kết pháp lý"><Link prefetch={false} href="/huong-dan">Hướng dẫn chuyên sâu</Link><Link prefetch={false} href="/phap-ly/dieu-khoan">Điều khoản</Link><Link prefetch={false} href="/phap-ly/quyen-rieng-tu">Quyền riêng tư</Link><Link prefetch={false} href="/phap-ly/du-lieu-ca-nhan">Dữ liệu cá nhân</Link><Link prefetch={false} href="/phap-ly/thanh-toan-hoan-tien">Thanh toán &amp; hoàn tiền</Link><Link prefetch={false} href="/phap-ly/cong-dong">Cộng đồng</Link><Link prefetch={false} href="/phap-ly/ban-quyen">Bản quyền</Link><Link prefetch={false} href="/phap-ly/bao-cao-vi-pham">Báo cáo vi phạm</Link><Link prefetch={false} href="/phap-ly/lien-he-ho-tro">Chính sách liên hệ</Link><Link prefetch={false} href="/ho-tro">Liên hệ &amp; hỗ trợ</Link></nav></footer>
      <span className="visually-hidden" role="status" aria-live="polite">Đang xem chế độ {expert ? 'Chuyên sâu' : 'Cơ bản'}</span>
    </div>
    <nav className="bottom-nav" aria-label="Điều hướng điện thoại" inert={menu || searchOpen}>{mobileLinks.map(item => <Link prefetch={false} key={item.href} aria-current={route === item.href || (item.href !== '/' && route.startsWith(item.href + '/')) ? 'page' : undefined} href={item.href}><span aria-hidden="true"><NavigationSymbol symbol={item.symbol} href={item.href}/></span><small>{item.text}</small></Link>)}<button type="button" onClick={() => setMenu(true)} aria-controls="thiendo-sidebar" aria-expanded={menu}><span aria-hidden="true">☰</span><small>Menu</small></button></nav>
    {tooltip && compact && !narrow && <div role="tooltip" className="navigation-tooltip" style={{left:tooltip.left,top:tooltip.top}}>{tooltip.label}</div>}
    {searchOpen && <div className="command-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeSearch(); }}>
      <section className="command-panel" role="dialog" aria-modal="true" aria-label="Tìm nhanh trang và công cụ" onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input, button:not([disabled])'));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
        <div className="command-head"><span aria-hidden="true">⌕</span><input ref={searchInput} type="search" role="combobox" aria-label="Nhập tên công cụ cần tìm" aria-expanded="true" aria-autocomplete="list" aria-controls="thiendo-search-results" aria-activedescendant={matches.length ? `tool-option-${activeResult}` : undefined} placeholder="Tìm lá số, Bát Tự, lịch, ngày tốt..." value={query} onChange={event => { setQuery(event.target.value); setActiveResult(0); }} onKeyDown={searchKeys} /><button type="button" className="command-close" aria-label="Đóng tìm nhanh" onClick={closeSearch}>✕</button></div>
        <div id="thiendo-search-results" className="command-results" role="listbox" aria-label="Kết quả tìm kiếm">{matches.length ? matches.map((item, index) => <button type="button" key={item.href} id={`tool-option-${index}`} role="option" aria-selected={index === activeResult} className={'command-option' + (index === activeResult ? ' selected' : '')} onMouseEnter={() => setActiveResult(index)} onClick={() => selectResult(item.href)}><span className="command-symbol" aria-hidden="true"><NavigationSymbol symbol={item.symbol} href={item.href}/></span><span><strong>{item.text}</strong><small>{navigationCategory(item.href)} · {item.caption}</small></span><span className="command-arrow" aria-hidden="true">↗</span></button>) : <p className="command-empty">Không tìm thấy công cụ phù hợp. Thử “tử vi”, “lịch” hoặc “bát tự”.</p>}</div>
      </section>
    </div>}
  </div>;
}

/** Shares the AuthProvider avatar revision with the account dialog. On an
 * expired/corrupt avatar response, show the user's initial instead of a
 * broken image; reset after a confirmed profile mutation or user switch. */
function ShellAvatar({userId,displayName,hasAvatar,avatarRevision}: {userId:string|null;displayName:string;hasAvatar:boolean;avatarRevision:number}) {
  const [failed,setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [userId,hasAvatar,avatarRevision]);
  if (!userId) return <TianMark size={24}/>;
  if (!hasAvatar || failed) return <>{displayName.charAt(0).toUpperCase() || '天'}</>;
  return <img key={`${userId}-${avatarRevision}`} src={`/api/auth/avatar?v=${avatarRevision}`} alt="" className="shell-avatar-photo" onError={() => setFailed(true)}/>;
}
