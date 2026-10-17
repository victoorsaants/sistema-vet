import type { NextConfig } from "next";

const LIMITE_UPLOAD = "11mb";

const nextConfig: NextConfig = {
  output: process.env.SAIDA_STANDALONE === "true" ? "standalone" : undefined,
  experimental: {
    serverActions: {
      bodySizeLimit: LIMITE_UPLOAD,
    },
    proxyClientMaxBodySize: LIMITE_UPLOAD,
  },
};

export default nextConfig;
