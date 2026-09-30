import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.gstatic.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://placehold.co https://lh3.googleusercontent.com https://firebasestorage.googleapis.com",
              "connect-src 'self' https://*.firebase.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://generativelanguage.googleapis.com https://api.razorpay.com",
              "frame-src 'self' blob:",
              "media-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Allow images from external sources
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },

  // Exclude server-only packages from client bundle
  serverExternalPackages: ["firebase-admin", "razorpay"],

  // Turbopack config (Next.js 16+ default bundler)
  turbopack: {},
};

export default nextConfig;
