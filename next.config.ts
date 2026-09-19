import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Product images may be uploaded locally (/uploads/...) or pasted in as a
    // remote URL. Remote hosts must be allowlisted here — add your CDN when you
    // switch the storage adapter over.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  // The Razorpay SDK is CommonJS — keep it out of the bundler.
  serverExternalPackages: ["razorpay"],
};

export default nextConfig;
