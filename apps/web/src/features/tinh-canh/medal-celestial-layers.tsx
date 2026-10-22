import styles from '../../components/tinh-canh-medal.module.css';

/** Decorative layers only: fixed SVG paths, transform/opacity animation, no frame loop. */
export function MedalCelestialLayers({
  level,
  light,
  accent
}: {
  level: number;
  light: string;
  accent: string;
}) {
  if (level < 12) return null;
  return <g fill="none" stroke={light} strokeWidth=".65" aria-hidden="true">
    <g className={styles.satelliteTrack} data-detail="satellite">
      <circle cx="50" cy="50" r="35" strokeOpacity=".2" />
      <path d="M50 12L52 16L50 20L48 16Z" fill={light} stroke="none" />
    </g>
    {level >= 13 && <g className={styles.celestialFrame} data-depth-plane="front">
      <ellipse cx="50" cy="50" rx="42" ry="34" strokeOpacity=".6" />
      <path d="M8 50H14M86 50H92M50 16V11M50 89V84" strokeWidth="1.3" />
    </g>}
    {level >= 16 && <g className={styles.celestialBack} data-depth-plane="back">
      <ellipse cx="50" cy="50" rx="44" ry="26" strokeOpacity=".75" />
      <circle cx="9" cy="50" r="1.5" fill={light} />
      <circle cx="91" cy="50" r="1.5" fill={light} />
    </g>}
    {level === 17 && <g className={styles.galaxyTrack} data-detail="galaxy-arms">
      <path d="M17 51C24 18 78 15 84 51M17 49C23 82 78 85 84 49" strokeWidth="1.2" strokeOpacity=".8" />
      <circle cx="22" cy="36" r="1.3" fill={light} />
      <circle cx="78" cy="64" r="1.3" fill={light} />
    </g>}
    {level === 18 && <>
      <g className={styles.infinityTrack} data-detail="infinite-cosmos" stroke={accent}>
        <path d="M50 50C9 4 3 84 32 72C52 65 48 35 68 28C97 16 91 96 50 50Z" strokeWidth=".9" strokeOpacity=".7" />
        <path d="M50 50C9 4 3 84 32 72C52 65 48 35 68 28C97 16 91 96 50 50Z" transform="rotate(90 50 50)" strokeOpacity=".35" />
      </g>
      <g className={styles.solarCrown} data-detail="solar-crown" fill={accent}>
        {Array.from({
          length: 12
        }, (_, index) => <path key={index} d="M50 4L51.2 8L50 11L48.8 8Z" fill={accent} stroke="none" transform={`rotate(${index * 30} 50 50)`} />)}
      </g>
    </>}
  </g>;
}
