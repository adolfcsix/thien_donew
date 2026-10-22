/**
 * Build-readiness dependency contract for first-party TypeScript/JavaScript apps.
 * Uses the TypeScript AST already required by check-source.mjs, so comments and
 * example strings cannot be mistaken for real imports.
 *
 * Checks only direct imports of the app. npm ci still owns peer/transitive
 * resolution, semver compatibility and integrity verification.
 */
import { builtinModules } from 'node:module';

const nodeBuiltins = new Set(builtinModules.map(name => name.replace(/^node:/, '')));

export function packageNameForSpecifier(specifier) {
  if (typeof specifier !== 'string' || !specifier || specifier.startsWith('.') ||
      specifier.startsWith('/') || specifier.startsWith('#') || specifier.startsWith('@/') ||
      specifier.startsWith('node:') || nodeBuiltins.has(specifier) ||
      specifier.startsWith('https:') || specifier.startsWith('http:')) return null;
  const segments = specifier.split('/');
  if (specifier.startsWith('@')) return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : null;
  return segments[0];
}

export function collectModuleSpecifiers(ts, file) {
  const imports = new Set();
  function add(node) {
    if (node && ts.isStringLiteralLike(node)) imports.add(node.text);
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression);
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require')) add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return [...imports];
}

export function undeclaredImports(specifiers, manifest) {
  const declared = new Set(Object.keys({
    ...(manifest.dependencies || {}),
    ...(manifest.devDependencies || {}),
    ...(manifest.peerDependencies || {}),
    ...(manifest.optionalDependencies || {}),
  }));
  return [...new Set(specifiers.map(packageNameForSpecifier).filter(Boolean))]
    .filter(name => !declared.has(name)).sort();
}
