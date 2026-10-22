import Link from 'next/link';
import { ScrollReveal } from '@/components/scroll-reveal';
import { ToolDirectory } from '@/components/tool-directory';
import copy from '@/customize/home.json';
import styles from './home-v139.module.css';

export default function Home() {
  return <div className={styles.home} data-home>
    <ScrollReveal selector="[data-home]" />
    <section className={`${styles.hero} thien-mon-home-hero`} aria-labelledby="home-title">
      <div className={`${styles.heroCopy} thien-mon-home-copy`}>
        <span className={styles.eyebrow}>{copy.eyebrow}</span>
        <h1 id="home-title">{copy.headline}<br />
          <em>{copy.headlineAccent}</em>
        </h1>
        <p>{copy.introduction}</p>
        <div className={styles.actions}>
          <a className="btn gold" href="#bo-mon">{copy.primaryAction} <span aria-hidden="true">↓</span>
          </a>
          <Link prefetch={false} className="btn secondary" href="/academy">{copy.secondaryAction}</Link>
        </div>
        <span className={styles.heroNote}>{copy.note}</span>
      </div>
      <div className={`${styles.art} thien-mon-home-art`} aria-hidden="true">
        <div className="thien-mon-home-scene thien-mon-home-scene--dark" />
        <div className="thien-mon-home-scene thien-mon-home-scene--light" />
      </div>
    </section>
    <div className={styles.paths} aria-label={copy.pathsLabel}>
      <Link data-scroll-reveal prefetch={false} href="/birth-profiles">
        <span aria-hidden="true">◎</span>
        <div>
          <strong>{copy.profileTitle}</strong>
          <small>{copy.profileDescription}</small>
        </div>
        <span aria-hidden="true">↗</span>
      </Link>
      <Link data-scroll-reveal prefetch={false} href="/study">
        <span aria-hidden="true">✎</span>
        <div>
          <strong>{copy.studyTitle}</strong>
          <small>{copy.studyDescription}</small>
        </div>
        <span aria-hidden="true">↗</span>
      </Link>
    </div>
    <ToolDirectory />
    <section className={styles.shelves} aria-labelledby="discover-title">
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.eyebrow}>{copy.discoverEyebrow}</span>
          <h2 id="discover-title">{copy.discoverTitle}</h2>
          <p>{copy.discoverDescription}</p>
        </div>
      </div>
      <div className={styles.shelfGrid}>
        <Link prefetch={false} href="/books" className={styles.shelf} data-scroll-reveal data-tone="jade">
          <span className={styles.shelfMark} aria-hidden="true">冊</span>
          <span className={styles.shelfNumber}>{copy.booksLabel}</span>
          <h3>{copy.booksTitle}</h3>
          <p>{copy.booksDescription}</p>
          <span className={styles.shelfArrow} aria-hidden="true">↗</span>
        </Link>
        <Link prefetch={false} href="/van-kho" className={styles.shelf} data-scroll-reveal data-tone="bronze">
          <span className={styles.shelfMark} aria-hidden="true">文</span>
          <span className={styles.shelfNumber}>{copy.archiveLabel}</span>
          <h3>{copy.archiveTitle}</h3>
          <p>{copy.archiveDescription}</p>
          <span className={styles.shelfArrow} aria-hidden="true">↗</span>
        </Link>
        <Link prefetch={false} href="/forum" className={styles.shelf} data-scroll-reveal data-tone="sage">
          <span className={styles.shelfMark} aria-hidden="true">論</span>
          <span className={styles.shelfNumber}>{copy.forumLabel}</span>
          <h3>{copy.forumTitle}</h3>
          <p>{copy.forumDescription}</p>
          <span className={styles.shelfArrow} aria-hidden="true">↗</span>
        </Link>
        <Link prefetch={false} href="/huyen-giai" className={styles.shelf} data-scroll-reveal data-tone="indigo">
          <span className={styles.shelfMark} aria-hidden="true">✧</span>
          <span className={styles.shelfNumber}>{copy.aiLabel}</span>
          <h3>{copy.aiTitle}</h3>
          <p>{copy.aiDescription}</p>
          <span className={styles.shelfArrow} aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
    <section data-scroll-reveal className={styles.researchStrip} aria-labelledby="research-title">
      <span className={styles.researchGlyph} aria-hidden="true">◇</span>
      <div>
        <span className={styles.eyebrow}>{copy.researchEyebrow}</span>
        <h2 id="research-title">{copy.researchTitle}</h2>
        <p>{copy.researchDescription}</p>
      </div>
      <Link prefetch={false} className="btn secondary" href="/study">{copy.researchAction} <span aria-hidden="true">↗</span>
      </Link>
    </section>
    <footer className={styles.footer}>
      <p>{copy.footerNote}</p>
      <Link prefetch={false} href="/library">{copy.footerAction}</Link>
    </footer>
  </div>;
}
