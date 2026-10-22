/**
 * Select a GitHub Actions bootstrap result for precisely the checked-out
 * source commit. Read-only; never runs a workflow or downloads files.
 *
 * CLI: gh run list -w bootstrap-lockfile.yml --json databaseId,headSha,status,conclusion ...
 *      | node select-bootstrap-run.mjs <40-character-git-SHA>
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const isSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);

export function selectBootstrapRun(runs, expectedSha) {
  if (!isSha(expectedSha)) throw new Error('Expected a complete 40-character local Git commit SHA.');
  if (!Array.isArray(runs)) throw new Error('Expected a JSON array from gh run list.');
  const matched = runs.filter(run => run && run.headSha?.toLowerCase() === expectedSha.toLowerCase() &&
    Number.isSafeInteger(run.databaseId) && run.databaseId > 0 &&
    (run.headBranch === undefined || run.headBranch === 'main'));
  if (!matched.length) throw new Error('No bootstrap run matches the current main-branch source commit; do not reuse an older artifact.');
  // The latest run is authoritative even if an older matching run succeeded.
  matched.sort((a, b) => b.databaseId - a.databaseId);
  const current = matched[0];
  if (current.status !== 'completed') {
    throw new Error(`Latest matching bootstrap run #${current.databaseId} is ${current.status ?? 'not completed'}.`);
  }
  // A fullstack failure is permitted here because the earlier lockfile job may
  // have completed successfully, uploading a valid lockfile and diagnostic logs.
  if (!['success', 'failure'].includes(current.conclusion)) {
    throw new Error(`Bootstrap run #${current.databaseId} ended with ${current.conclusion ?? 'unknown'}; do not trust its artifact.`);
  }
  return { id: String(current.databaseId), conclusion: current.conclusion, sha: expectedSha.toLowerCase() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const runs = JSON.parse(readFileSync(0, 'utf8'));
    const selected = selectBootstrapRun(runs, process.argv[2]);
    process.stdout.write(`${selected.id}\n`);
  } catch (error) {
    console.error(`BLOCKED: ${error.message}`);
    process.exitCode = 2;
  }
}
