import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/client/create-job',
        destination: '/jobs/new',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
