/** Pure helpers for local build diagnostics. */
/** Conservative redaction; user should still review logs before sharing. */
export function redactDiagnostic(value) {
  return String(value)
    .replace(/\b(?:postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/gi, '[DATABASE_URL_REDACTED]')
    .replace(/(\b(?:DATABASE_URL|PASSWORD|PGPASSWORD|SESSION_SECRET|COOKIE_SECRET|API_KEY|TOKEN|NPM_TOKEN|GITHUB_TOKEN|GH_TOKEN)\s*[:=]\s*)(?:\"[^\"\r\n]*\"|'[^'\r\n]*'|[^\s,;\r\n]+)/gi, '$1[REDACTED]')
    .replace(/(Authorization:\s*Bearer\s+)\S+/gi, '$1[REDACTED]')
    .replace(/(npm_[a-z_]*token\s*=\s*)\S+/gi, '$1[REDACTED]');
}
export function classifyCheck(status, actualCode) {
  if (status === 'SKIPPED') return 'SKIPPED';
  return actualCode === 0 ? 'PASS' : 'FAIL';
}

/** Testable policy: a valid lockfile skips npm install resolution entirely.
 * npm ci does not require node_modules to exist beforehand.
 */
export function chooseInstallStrategy({ installRequested, npmAvailable, lockfileValid, hasNodeModules }) {
  if (!npmAvailable) return 'BLOCKED';
  if (installRequested && !lockfileValid) return 'GENERATE_LOCK';
  if (lockfileValid && (installRequested || hasNodeModules)) return 'USE_LOCKFILE';
  return 'SKIP';
}

/** package.json requires >=22.13.0 (Node 22 release cadence). */
export function isSupportedNodeVersion(stdout) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)\s*$/.exec(String(stdout).trim());
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major > 22 || (major === 22 && (minor > 13 || (minor === 13 && patch >= 0)));
}
