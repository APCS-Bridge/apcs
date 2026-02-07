import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // API backend URL for server-side requests
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    NEXT_PUBLIC_AGENT_API_URL: process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000',
  },
};

export default nextConfig;
