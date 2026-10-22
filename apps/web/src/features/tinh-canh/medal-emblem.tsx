import { emblemPaths } from './medal-designs';
export function MedalEmblem({
  level,
  light,
  dark
}: {
  level: number;
  light: string;
  dark: string;
}) {
  return <g data-emblem={level} stroke={light} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <circle cx="50" cy="50" r="22" fill={dark} fillOpacity=".9" stroke="none" />
    <circle cx="50" cy="50" r="21" fill="#0c1b24" fillOpacity=".72" strokeOpacity=".3" strokeWidth=".6" />
    {emblemPaths[level - 1].map((d, index) => <path key={index} d={d} vectorEffect="non-scaling-stroke" />)}
  </g>;
}
