import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Garment media comes from Cloudinary URLs stored in the database.
  // Plain <img> is used so no remote-pattern allowlist is needed.
  images: { unoptimized: true },
};

export default nextConfig;
