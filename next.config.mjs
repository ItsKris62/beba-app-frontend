import path from 'node:path';
import { fileURLToPath } from 'node:url';

// F8: Validate required env vars at build time
if (!process.env.NEXT_PUBLIC_TENANT_ID) {
  throw new Error('NEXT_PUBLIC_TENANT_ID env var is required. Set it in .env.local');
}

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

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
};

export default nextConfig;
