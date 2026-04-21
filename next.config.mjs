// F8: Validate required env vars at build time
if (!process.env.NEXT_PUBLIC_TENANT_ID) {
  throw new Error('NEXT_PUBLIC_TENANT_ID env var is required. Set it in .env.local');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
