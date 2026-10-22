# A73 — Dependency triage (NO-GO)

Base: A72 V11.164.99. This is an interim engineering checkpoint, not a production release or evidence of a completed full regression run.

## Changes
- Added `infrastructure/scripts/a73-dependency-triage.mjs`: read-only JSON diagnostics of declared, lockfile-present and resolvable dependencies per workspace. Exit code 2 indicates unresolved dependencies. Does not mock dependencies or mark blocked tests as passing.

## Verified
- Node v22.16.0.
- `node --test tests/dependency-contract.test.cjs`: 5/5 PASS (see `dependency-contract.tap`).
- `node infrastructure/scripts/check-migration-chain.mjs`: 36/36 contiguous frozen SHA-256 migrations PASS.
- `node infrastructure/scripts/a73-dependency-triage.mjs`: exits 2, unresolved dependencies remain (see JSON).

## Not verified
- 44 blocked A71 tests, full test sharding, typecheck, Next/Nest builds, native PostgreSQL, browser E2E, PayOS and Gemini integrations. No claims of fixing these blockers.

## Next steps
On a trusted network-enabled machine: `npm ci --no-audit --no-fund`; `npm run check:dependencies`; `npm run typecheck`; `npm run build`; `npm test`. Collect raw results and investigate business failures separately from missing imports. Preserve NO-GO gates until evidence exists.
