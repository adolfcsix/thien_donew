# Stability pass after export changes — 8 November 2026

## Changes
- Serialize Western SVG/PNG export with the existing pending-operation lifecycle. Both export buttons are disabled during rendering; duplicate synchronous calls are rejected by the operation ref.
- Abort ownership follows component lifetime. A cancelled image conversion cannot initiate a download or update error state after its view is gone.
- Move temporary SVG-image ownership into `svgToPng`. Its object URL is released in a finally block on success, decode failure or cancellation; actual downloads continue to use the shared attached-anchor helper.
- Add an executable resource-release test and a browser test that deliberately holds image decoding, checks both buttons are disabled, and then allows the real PNG to finish.
- Update one evidence-scope assertion to match the accurate mixed test setup: Natal uses real account/calculation HTTP while other suites retain fixtures. Native PostgreSQL, provider delivery, Windows and Safari acceptance are still explicitly excluded from that browser report.

## Initial failures
The initial full regression reproduced the same two failures seen on GitHub run 42456773274: the temporary rasterization URL was in a module reserved for shared download handling, and a source assertion expected the older blanket statement about mocked accounts. Both were addressed without removing either test.

## Limits
This pass does not close the known WebKit conversation-navigation error, certify a physical iPhone/Windows browser, or establish ingress/load capacity. It is not a production-ready verdict.

## Completed local checks
- Full API/web build and packaged standalone assets: PASS.
- TypeScript API/web and source integrity: PASS.
- Full Node regression: 3227/3227 PASS across 375 files.
- Focused download/evidence checks: 10/10 PASS.

- Full real-session Chromium account/UI harness: 115/115 PASS; zero page errors. SQL engine is isolated PGlite, and external providers are controlled.
- Export Chromium harness: PASS at 390 and 1440px, including deliberate decode delay/disabled buttons, SVG document, PNG dimensions and Tarot decoded artwork/PDF.
