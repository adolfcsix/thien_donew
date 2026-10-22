import {CommunityBadges} from '@/features/community-hub/identity';
import Link from 'next/link';
import styles from '../../app/forum/forum.module.css';

/** Public display name and profile link; never derive identity from an email. */
export function MemberIdentity({ id, name }: { id: string; name: string }) {
  return <span className="hub-member-identity"><Link className={styles.memberIdentity} href={'/forum/members/' + id}>
    <span className={styles.memberInitial} aria-hidden="true">{Array.from(name.trim())[0]?.toLocaleUpperCase('vi') || 'T'}</span>
    <strong>{name}</strong>
  </Link><CommunityBadges id={id}/></span>;
}
