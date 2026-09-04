/** @type {import('next').NextConfig} */
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig = {
  transpilePackages: ["@bbspos/db", "@bbspos/ui", "@bbspos/types"],
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
