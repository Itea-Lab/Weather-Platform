import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Reduce memory usage during build
  experimental: {
    // Enable build performance optimizations
    optimizePackageImports: ["lucide-react", "@aws-sdk/*"],
    // Reduce bundle analysis memory
    webpackBuildWorker: false,
  },
  
  // Reduce bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Enable build caching
  generateBuildId: async () => {
    return "build-cache-" + Date.now();
  },

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
