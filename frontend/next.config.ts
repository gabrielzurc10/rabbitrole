import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → S3 + CloudFront (no Node server at runtime).
  output: "export",
  // CloudFront serves directory-style URLs; emit /path/index.html.
  trailingSlash: true,
  // The export target has no Next.js image optimizer.
  images: { unoptimized: true },
};

export default nextConfig;
