import { assertSafeE2ETarget } from './e2e-guard.mjs';
try {
  const { databaseName, databaseHost } = assertSafeE2ETarget();
  console.log(`E2E target allowed by local-name guard: ${databaseHost}/${databaseName}`);
  console.log('IMPORTANT: This check cannot prove the database is empty or disposable. Confirm manually.');
} catch (error) {
  console.error(`BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
