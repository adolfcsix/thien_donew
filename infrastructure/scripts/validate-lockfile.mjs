/** Offline npm lockfile structure validator.
 * Does not pretend to replace npm ci, which verifies actual resolution/content.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, posix as pathPosix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

/** Receives a parsed npm lock and a map of workspace path -> package.json. */
export function validateLockStructure(lock, rootPkg, manifests) {
  const errors = [];
  if (!isObject(lock) || lock.lockfileVersion !== 3 || !isObject(lock.packages)) {
    return ['Expected npm v10 package-lock.json (lockfileVersion 3 with packages map)'];
  }
  const lockRoot = lock.packages[''];
  if (!isObject(lockRoot) || lockRoot.name !== rootPkg.name || lockRoot.version !== rootPkg.version) {
    errors.push('Lockfile root name/version does not match package.json');
  }
  const workspaces = rootPkg.workspaces || [];
  const nameByWorkspace = new Map(
    workspaces.map(path => [path, manifests[path]?.name]).filter(([, name]) => typeof name === 'string')
  );
  if (!Array.isArray(workspaces) || !workspaces.length) errors.push('No workspaces declared');
  for (const path of workspaces) {
    const manifest = manifests[path];
    const entry = lock.packages[path];
    if (!isObject(manifest) || !isObject(entry)) {
      errors.push(`Missing workspace manifest or lock entry: ${path}`);
      continue;
    }
    if (entry.name !== manifest.name || entry.version !== manifest.version) {
      errors.push(`Workspace identity/version drift: ${path}`);
    }
    const link = lock.packages[`node_modules/${manifest.name}`];
    if (!isObject(link) || link.link !== true || link.resolved !== path) {
      errors.push(`Workspace link is missing or inconsistent: ${manifest.name}`);
    }
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(manifest[field] || {})) {
        if (entry[field]?.[name] !== range) errors.push(`Lock entry differs from ${path}/${field}: ${name}`);
      }
    }
  }
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, range] of Object.entries(rootPkg[field] || {})) {
      if (lockRoot?.[field]?.[name] !== range) errors.push(`Root lock entry differs for ${name}`);
    }
  }
  // Check each local file: declaration against the corresponding installed
  // workspace link. A valid name alone cannot prove the lock installs the
  // intended in-repository package. Never resolve a file: path from CWD.
  for (const [owner, manifest] of [['', rootPkg], ...Object.entries(manifests)]) {
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(manifest[field] || {})) {
        if (typeof range !== 'string' || !range.startsWith('file:')) continue;
        const target = range.slice(5);
        const dest = pathPosix.normalize(pathPosix.join(owner, target));
        if (!target || pathPosix.isAbsolute(target) || dest === '..' || dest.startsWith('../') ||
            nameByWorkspace.get(dest) !== name) {
          errors.push(`Unsafe or mismatched local workspace reference: ${owner || '.'}/${name} -> ${range}`);
          continue;
        }
        const link = lock.packages[`node_modules/${name}`];
        if (!isObject(link) || link.link !== true || link.resolved !== dest) {
          errors.push(`Local workspace link is incorrect: ${owner || '.'}/${name} -> ${dest}`);
        }
      }
    }
  }
  // npm ci must still validate the complete dependency graph and integrity.
  // This catches missing direct registry packages and integrity-less tampering.
  const direct = [rootPkg, ...Object.values(manifests)].flatMap(pkg =>
    Object.entries({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}),
      ...(pkg.optionalDependencies || {}), ...(pkg.peerDependencies || {}) }));
  for (const [name, range] of direct) {
    if (String(range).startsWith('file:') || String(range).startsWith('workspace:')) continue;
    const item = lock.packages[`node_modules/${name}`];
    if (!isObject(item) || typeof item.version !== 'string' || !item.version) {
      errors.push(`Missing resolved direct npm dependency: ${name}`);
    } else if (!item.resolved?.startsWith('https://') || !/^sha(512|1)-/.test(item.integrity || '')) {
      errors.push(`Direct npm dependency missing HTTPS provenance or integrity: ${name}`);
    }
  }
  return [...new Set(errors)];
}

export function validateLockFile(lockfilePath, root = ROOT) {
  const rootPkg = readJson(resolve(root, 'package.json'));
  const manifests = Object.fromEntries(rootPkg.workspaces.map(path => [path, readJson(resolve(root, path, 'package.json'))]));
  const lock = readJson(resolve(lockfilePath));
  return validateLockStructure(lock, rootPkg, manifests);
}

export function validateRepositoryLock(root = ROOT) {
  return validateLockFile(resolve(root, 'package-lock.json'), root);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const errors = process.argv[2] ? validateLockFile(process.argv[2]) : validateRepositoryLock();
    if (errors.length) { for (const error of errors) console.error(`BLOCKED: ${error}`); process.exitCode = 1; }
    else console.log('PASS: npm lockfile workspace and direct-dependency structure; run npm ci for complete validation.');
  } catch (error) {
    console.error('BLOCKED: valid package-lock.json missing or unreadable:', error.message);
    process.exitCode = 1;
  }
}
