import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server for small, edge-friendly container images.
  output: "standalone",
  // Keep the OpenTelemetry SDK out of the bundler; load it as Node externals.
  serverExternalPackages: [
    "@opentelemetry/sdk-trace-node",
    "@opentelemetry/sdk-metrics",
    "@opentelemetry/exporter-prometheus",
    "@opentelemetry/exporter-trace-otlp-http",
    "@opentelemetry/exporter-metrics-otlp-http",
  ],
};

export default nextConfig;
