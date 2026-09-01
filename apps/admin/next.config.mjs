/** @type {import('next').NextConfig} */
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig = {
  transpilePackages: ["@bubba/db", "@bubba/ui", "@bubba/types"],
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
