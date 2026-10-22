/** Check browser mutation origins against the configured application origin.
 * Never derive an allow-list from untrusted Host or forwarded headers.
 * CLI/API clients without browser origin metadata remain supported. */
export function isTrustedMutation(
  origin: string | string[] | undefined,
  fetchSite: string | string[] | undefined,
  allowedOrigin: string,
): boolean {
  if (Array.isArray(origin) || Array.isArray(fetchSite)) return false;
  if (origin !== undefined && origin !== allowedOrigin) return false;
  if (fetchSite === 'cross-site' || fetchSite === 'same-site' && !origin) return false;
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
  return true;
}
