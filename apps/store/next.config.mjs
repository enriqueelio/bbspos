import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https?.*\/api\/catalog/,
      handler: "NetworkFirst",
      options: {
        cacheName: "bubba-catalog",
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 60 * 60 * 24,
        },
        networkTimeoutSeconds: 3,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https?.*\/build/,
      handler: "NetworkFirst",
      options: {
        cacheName: "bubba-build-page",
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 60 * 60 * 24,
        },
        networkTimeoutSeconds: 3,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https?.*\/(?!api\/|_next\/|build\/).*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "bubba-pages",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24,
        },
        networkTimeoutSeconds: 3,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/_next\/static.+\.js$/,
      handler: "CacheFirst",
      options: {
        cacheName: "bubba-static-js",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /^https?.*\/images\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "bubba-images",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@bubba/db", "@bubba/ui", "@bubba/types"],
};

export default withPWA(nextConfig);
