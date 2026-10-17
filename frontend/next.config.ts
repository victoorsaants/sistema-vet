import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um servidor Node mínimo em .next/standalone, usado pela imagem Docker
  output: "standalone",
};

export default nextConfig;
