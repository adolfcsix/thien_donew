# Export presentation — 8 November 2026

Implemented:
- Tu Vi: self-contained cloud/corner ornamentation, profile hierarchy and two-column personal data. This round also wraps long unbroken labels and removes the redundant personal name from the top subtitle.
- Western wheel: styled SVG document with theme-matched background, double frame, title and footer; PNG export at 2400×2720. Existing plotted data and visible filters are preserved.
- Tarot: a dedicated A4 print/PDF view with decoded card artwork, position order, orientation, meaning and reflection. User strings are escaped, and the main private question is not added. A separate print button leaves the study JSON workflow intact.

Verification: production web build; focused chart/celestial Node tests (12/12); real-session Chromium through Next/API/PGlite at 390 and 1440px for Western SVG/PNG and Tarot print. Exported PNG and rendered Tarot PDF pages were inspected. This does not certify physical iOS/Windows or all deck variants. The broader system CI and WebKit issue remain separate open work.

Scope: polished visual export paths above. CSV/JSON/Markdown exports remain structured research data. Other disciplines do not yet all have illustrated report exports. No claim of complete visual redesign across every discipline.
