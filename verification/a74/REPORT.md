# A74 — GitHub source preflight (NO-GO)

Source: A73. Added read-only `npm run check:github:source` preflight.

PASS: lockfile structure, 36-migration chain, heuristic secret scan (1556 files), architecture (566 files/2190 imports), gitignore rules, and unchanged NO_GO release gates.

BLOCKED: dependency readiness (11 missing workspace module resolutions). Full npm ci, typecheck, build, complete tests, PostgreSQL native E2E, browser/mobile performance and legal approval remain unverified.

This preflight does not establish GitHub-ready status by itself. Before push, install dependencies from immutable lockfile, run tests/build and inspect `git status`, staged diff and tracked files for secrets. Use a private repository. No push performed.
