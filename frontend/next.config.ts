import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supaya bisa dites dari HP lewat WiFi yang sama (http://192.168.x.x:3000) saat `npm run dev`.
  // Tanpa ini Next.js memblokir file JavaScript development dari alamat selain localhost.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
