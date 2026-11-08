# Admin MFA gate — 8 November 2026

Fixed contradictory UI when configured=false and enabled=true: it previously displayed an Authenticator-code heading while deliberately hiding the actual input. Configuration is now a prerequisite for the verification heading, input, remembered-device explanation and first-enrollment email steps.

Missing-config guidance distinguishes initial enrollment from an already linked account. Existing links require restoration of the original server encryption key; the gate does not suggest generating a replacement key. Card width and responsive padding are explicit, and OTP editing is disabled while verification is pending.

Validation: production web build PASS; 7 focused Node tests PASS, including server-rendered state combinations. Chromium with real Owner session and controlled MFA-status responses PASS for missing-config/already-linked, missing-config/new, and configured/already-linked at 390 and 1440px (6 cases). Ready-state input accepts six digits and enables verification. Screenshots inspected; no horizontal overflow or page errors. This targeted check does not claim a new full-suite or physical-device pass, and does not repair the user's local .env remotely.
