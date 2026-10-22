import {verifyMigrationChain,defaultDbDir,defaultBaselinePath} from './lib/migration-chain-integrity.mjs';
const result=verifyMigrationChain(defaultDbDir,defaultBaselinePath);
console.log(`PASS: ${result.total} contiguous SQL migrations; ${result.frozen} byte-for-byte SHA-256 frozen; no DB connections`);
