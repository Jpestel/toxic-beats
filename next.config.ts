import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Augmente la limite des body pour les uploads de gros fichiers audio (WAV, ZIP)
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
