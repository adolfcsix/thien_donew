import type { NextConfig } from 'next';
import {resolve} from 'node:path';

/** Keep browser requests first-party; the server forwards /api/* to NestJS.
 * API_INTERNAL_URL must be an HTTP(S) origin, configured server-side only. */
const backend = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const parsed = new URL(backend);
if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
  throw new Error('API_INTERNAL_URL must be a plain HTTP(S) origin');
}

const nextConfig: NextConfig = {
  transpilePackages: ['@thiendo/astrology-engine', '@thiendo/chart-export', '@thiendo/good-days-export', '@thiendo/shared-types'],
  reactStrictMode: true,
  output: 'standalone',
  // Compile without optional disk persistence: repeated cached builds panicked.
  // This keeps compilation and type checks enabled.
  experimental: { turbopackFileSystemCacheForBuild: false },
  outputFileTracingRoot: resolve(__dirname, '../..'),
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [{source: '/:path*', headers: [
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
      {key:'Content-Security-Policy',value:"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"},
      ...(process.env.NODE_ENV==='production'?[{key:'Strict-Transport-Security',value:'max-age=31536000'}]:[]),
    ]},{source:'/api/books/:slug/file',headers:[{key:'X-Frame-Options',value:'SAMEORIGIN'},{key:'Content-Security-Policy',value:"frame-ancestors 'self'; object-src 'none'; base-uri 'self'"}]}];
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};
export default nextConfig;
