import Link from 'next/link';
import styles from './discipline-navigation.module.css';

import {westernWorlds} from '@/lib/western-worlds';

export function WesternIcon({ kind, size = 32 }: { kind: string; size?: number }) {
  return <svg viewBox="0 0 32 32" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'orbit' ? <><circle cx="16" cy="16" r="12" /><circle cx="16" cy="16" r="6" /><path d="M16 2v5m0 18v5M2 16h5m18 0h5M7 7l4 4m10 10 4 4" /><circle cx="23" cy="6" r="2" /></>
      : kind === 'cards' ? <><rect x="10" y="4" width="16" height="24" rx="3" /><path d="M8 8 3 10l5 20 6-1M18 9l2 5 4 2-4 2-2 5-2-5-4-2 4-2Z" /></>
      : kind === 'library' ? <><path d="M4 7c4-2 8-2 12 1 4-3 8-3 12-1v20c-4-2-8-2-12 1-4-3-8-3-12-1V7ZM16 8v20M8 12h4M8 17h4M20 12h4M20 17h4"/></>
      : kind === 'number' ? <><circle cx="16" cy="16" r="13" /><path d="M13 9h5l-4 14M10 14h11M10 19h9" /><circle cx="5" cy="7" r="1" /></>
      : <><path d="m16 4-8 7v10l8 7 8-7V11L16 4Zm0 0v24M8 11l16 10M24 11 8 21M8 11h16M8 21h16" />{[[16,4],[8,11],[24,11],[16,16],[8,21],[24,21],[16,28]].map(([x,y]) => <circle key={x+':'+y} cx={x} cy={y} r="2" fill="var(--panel,#152922)" />)}</>}
  </svg>;
}

export function DisciplineNavigation({ current }: { current: string }) {
  return <nav className={styles.navigation} aria-label="Các nhánh Phương Tây và Biểu tượng">
    {westernWorlds.map(({path:href, name, label:caption, icon}) => <Link key={href} href={href} aria-current={(current === href || current.startsWith(href + '/')) ? 'page' : undefined}>
      <span className={styles.icon}><WesternIcon kind={icon} /></span><span><strong>{name}</strong><small>{caption}</small></span>
    </Link>)}
  </nav>;
}
