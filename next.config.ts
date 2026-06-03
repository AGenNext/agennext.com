import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server for small, edge-friendly container images.
  output: "standalone",
};

export default nextConfig;
