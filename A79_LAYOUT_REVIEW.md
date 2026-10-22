# A79 — Layout containment and review

Base: A78. Scope: static inspection of CSS layout patterns, with a focused adjustment to Western Symbols.

## Change
- Western Symbols: prevent long content from expanding cards/panels, constrain form controls, and use shrinkable columns in the two-column toolbar.
- Preserve intentionally horizontally scrollable data tables and do not change astrology/numerology calculations.

## Inspection notes
- Reviewed CSS inventory (126 stylesheets) and searched for fixed minimum widths, viewport widths, and overflow patterns.
- Fixed-width tables in chart, research and atlas areas have scroll containers in several locations; do not replace these with compressed unreadable tables.
- Auth modal scrolling, avatar crop, sidebar icon alignment, light/dark contrast, 3D motion and all viewport breakpoints require live-browser screenshot comparison; static inspection cannot certify appearance.

## Status
- Focused CSS containment assertion: PASS.
- Full browser visual regression and build: NOT RUN (dependencies unavailable).
- Release: NO-GO. No GitHub push.
