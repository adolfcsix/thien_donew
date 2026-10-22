/**
 * THIÊN ĐỒ identity / Thiên Môn — Cửa Trời.
 * Lightweight inline vector; no external CJK font, runtime fetch or 3D engine.
 * The 天 strokes remain legible even when the logo is used at favicon scale.
 * Palette is theme-driven by --tm-* variables on an ancestor.
 */
export function TianMonMark({ size = 52, compact = false, className = '' }: {
  size?: number;
  compact?: boolean;
  className?: string;
}) {
  return <svg className={`thien-mon-mark${compact ? ' thien-mon-mark--compact' : ''}${className ? ` ${className}` : ''}`}
    width={size} height={size} viewBox="0 0 100 110" fill="none" aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg" focusable="false">
    <g className="tm-outer-orbit" stroke="var(--tm-trace, #bea578)" strokeWidth=".85" opacity={compact ? '.43' : '.65'}>
      <path d="M9 62A43 43 0 0 1 91 62" />
      <path d="M14 36A44 44 0 0 1 86 36" strokeDasharray="2 4" />
    </g>
    <g fill="var(--tm-metal, #dfc48e)">
      <circle cx="50" cy="9.5" r="3.4" />
      {!compact && <><circle cx="14" cy="40" r="1.7" /><circle cx="86" cy="40" r="1.7" /></>}
    </g>
    <path d="M50 13.5V20" stroke="var(--tm-metal, #dfc48e)" strokeWidth="1.3" />
    {/* Tall jade-and-gold gate pillars: recognizable even without shadows. */}
    <path d="M17 24L29 17V85L17 92Z" fill="var(--tm-jade, #25604e)" stroke="var(--tm-metal, #dfc48e)" strokeWidth="1.65" strokeLinejoin="round" />
    <path d="M83 24L71 17V85L83 92Z" fill="var(--tm-jade, #25604e)" stroke="var(--tm-metal, #dfc48e)" strokeWidth="1.65" strokeLinejoin="round" />
    <path d="M22 26V85M78 26V85" stroke="var(--tm-shine, #f4e6c1)" strokeWidth="1" opacity=".77" />
    <path d="M29 17L33 24V81L29 85M71 17L67 24V81L71 85" stroke="var(--tm-trace, #bea578)" strokeWidth=".9" opacity=".85" />
    {/* A complete halo joins the gate to the central character. */}
    <circle cx="50" cy="54" r="27.8" fill="var(--tm-disc, #133128)" fillOpacity=".69" stroke="var(--tm-metal, #dfc48e)" strokeWidth="1.7" />
    <circle cx="50" cy="54" r="32.4" stroke="var(--tm-trace, #bea578)" strokeWidth=".75" opacity=".62" />
    {/* Hand-drawn geometry derived from the original 天 mark, not rendered with a font. */}
    <g stroke="var(--tm-character, #f6ebcf)" strokeWidth="3.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M38 42H62M31 52H69M50 42C50 61 44 68 34.5 72M50 53C53 62 59 68 66 72" />
    </g>
    {!compact && <g stroke="var(--tm-metal, #dfc48e)" strokeWidth="1.15" opacity=".78" strokeLinecap="round">
      <path d="M7 96C17 89 24 93 30 89M93 96C83 89 76 93 70 89" />
      <path d="M10 100C24 94 32 101 41 96M90 100C76 94 68 101 59 96" />
      <path d="M29 90L37 94M71 90L63 94" />
    </g>}
    <path d="M35 100H65" stroke="var(--tm-trace, #bea578)" strokeWidth="1" opacity=".6" />
    <circle cx="50" cy="103" r="1.5" fill="var(--tm-metal, #dfc48e)" />
  </svg>;
}
