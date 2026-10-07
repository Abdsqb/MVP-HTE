import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-mode badge so it doesn't cover the portals' demo timer.
  devIndicators: false,
  experimental: {
    // The project lives in OneDrive, whose syncing has corrupted Turbopack's dev
    // cache (crashes, routes missing after restart). Compile fresh each run instead.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
