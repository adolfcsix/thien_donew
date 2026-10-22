/** Pure, credential-free interpretation of a bounded npm registry probe. */
export function interpretRegistryProbe({ status, errorCode = '', output = '' } = {}) {
  const combined = `${errorCode} ${output}`;
  if (status === 0 && !errorCode) {
    return { status: 'PASS', category: 'REACHABLE', action: 'Registry reachable. This alone does not prove npm install or build.' };
  }
  const patterns = [
    [/EAI_AGAIN/i, 'DNS_TEMPORARY', 'DNS lookup temporarily failed. Check internet/DNS/proxy and retry, or use the private GitHub Actions bootstrap.'],
    [/ENOTFOUND/i, 'DNS_NOT_FOUND', 'Registry hostname could not be resolved. Check npm registry, DNS and network/proxy settings.'],
    [/E(?:TIMEDOUT|CONNRESET|CONNREFUSED|HOSTUNREACH|NETUNREACH)/i, 'NETWORK', 'Registry connection failed. Check firewall, proxy, VPN and internet connection.'],
    [/(?:CERT_HAS_EXPIRED|UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN|ERR_TLS)/i, 'TLS', 'Certificate validation failed. Fix proxy/certificate trust; do not disable TLS verification.'],
    [/(?:E401|E403|ENEEDAUTH)/i, 'AUTH', 'Registry authentication/permission failed. Check npm login and registry policy; never paste access tokens into logs.'],
  ];
  for (const [pattern, category, action] of patterns) {
    if (pattern.test(combined)) return {status:'BLOCKED',category,action};
  }
  if (/ETIMEDOUT|TIMEOUT/i.test(combined)) {
    return {status:'BLOCKED',category:'TIMEOUT',action:'Registry probe timed out. Check connectivity and use a remote build if necessary.'};
  }
  return { status:'BLOCKED', category:'UNCLASSIFIED', action:'Registry probe did not succeed. Inspect local npm logs privately and check network/configuration.' };
}
