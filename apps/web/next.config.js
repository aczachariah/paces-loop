/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enables src/instrumentation.ts, which validates EXAM_SESSION_SECRET at server start-up.
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
