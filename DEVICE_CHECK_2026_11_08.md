# Device compatibility check — 8 November 2026

Chromium emulation, not physical hardware: admin MFA state checks PASS 24/24 across 320x568, 390x844, 430x932, 844x390, 768x1024, 1024x768, 1366x768 and 1920x1080. Mobile/tablet contexts use touch and 2x scale; desktop contexts use mouse and 1x scale. Real Owner session; controlled MFA-status responses. Covers missing-config/new, missing-config/linked, configured/linked, touch focus, code entry, submit availability, reduced viewport height, preserved input and no horizontal overflow. Mobile and landscape screenshots inspected.

Chromium touch compatibility through actual Next/API/PGlite: 6/6 PASS (registration, username login, message persistence, backup restoration, simulated keyboard viewport and scroll restoration), zero page errors. Native randomUUID and SubtleCrypto are deliberately disabled for this HTTP-LAN compatibility test.

WebKit 26.5 was downloaded and launch attempted, but this runtime lacks GTK4/GStreamer and other required system libraries; no scoped package installer is available. No WebKit PASS or physical iPhone/Android/Windows claim. Added the same admin device matrix to Chromium and WebKit GitHub Actions runs, with retained artifacts; remote results remain pending. The pre-existing WebKit conversation-navigation issue remains open until rerun evidence resolves it.
