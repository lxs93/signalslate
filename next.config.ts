import type { NextConfig } from "next";
import { networkInterfaces } from "os";

// Let phones and laptops on the local network load dev assets (HMR, client JS).
// Next.js blocks cross-origin dev requests by default.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
  // A stray lockfile higher up (~/Desktop) makes Next guess the wrong root
  turbopack: { root: process.cwd() },
  // Keep the Next.js dev badge clear of the sidebar's Sign out link
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
