import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
// Next writes these declarations during build/type generation; source ZIPs
// intentionally exclude .next. Keep the exception limited to its generated stub.
const generatedTypes = new Set(['./.next/types/routes.d.ts', './.next/types/root-params.d.ts']);
export function isNextGeneratedTypeImport(sourcePath, specifier) {
  return sourcePath.replaceAll('\\', '/') === 'apps/web/next-env.d.ts' && generatedTypes.has(specifier);
}

// A compiled backend module is imported only by the built-artifact smoke runner.
// Only defer this exact generated file when its TypeScript source exists;
// never allow arbitrary missing dist imports in application code.
export function isDeferredBuildIdentityImport(sourcePath, specifier) {
  return sourcePath.replaceAll('\\', '/') === 'infrastructure/scripts/production-smoke.mjs' &&
    specifier === '../../apps/api/dist/common/e2e-identity.js';
}

/**
 * Isolated integration tests import compiled NestJS modules. The source audit
 * runs BEFORE the API build in CI, so those paths are legitimately absent in
 * a clean checkout. Defer ONLY a generated dist/modules import directly from
 * an explicit root-level *.test.mjs file, and ONLY if check-source confirms
 * the corresponding .ts source exists. Never defer runtime app imports, nested
 * paths, parent traversal, .cjs or arbitrary build output.
 */
export function deferredSqlTestSource(sourcePath, specifier) {
  const source = sourcePath.replaceAll('\\', '/');
  if (!/^tests\/[a-zA-Z0-9_-]+\.test\.mjs$/.test(source)) return null;
  // The full-stack test imports its Nest entrypoint/policies before starting an
  // isolated application. Allow these exact generated modules, with source proof.
  const httpSources = new Map([
    ['../apps/api/dist/app.module.js', 'apps/api/src/app.module.ts'],
    ['../apps/api/dist/common/database.service.js', 'apps/api/src/common/database.service.ts'],
    ['../apps/api/dist/common/operations.js', 'apps/api/src/common/operations.ts'],
    ['../apps/api/dist/common/origin-policy.js', 'apps/api/src/common/origin-policy.ts'],
  ]);
  if (source === 'tests/deep-stack-http.test.mjs' && httpSources.has(specifier)) {
    const target = httpSources.get(specifier);
    return existsSync(fileURLToPath(new URL('../../'+target, import.meta.url))) ? target : null;
  }
  const match = /^\.\.\/apps\/api\/dist\/modules\/([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*(?:\/[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)*)\.js$/.exec(specifier);
  if (!match) return null;
  const target = `apps/api/src/modules/${match[1]}.ts`;
  return existsSync(fileURLToPath(new URL('../../'+target, import.meta.url))) ? target : null;
}
