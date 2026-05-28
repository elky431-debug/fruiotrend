/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    serverComponentsExternalPackages: [
      "ffmpeg-static",
      "@ffmpeg-installer/ffmpeg",
    ],
  },
  async redirects() {
    return [
      { source: "/generate", destination: "/create", permanent: true },
      { source: "/generate/:path*", destination: "/create", permanent: true },
      { source: "/adcreative", destination: "/create", permanent: true },
      { source: "/adcreative/:path*", destination: "/create", permanent: true },
      { source: "/credits", destination: "/plans", permanent: true },
    ];
  },
};

export default nextConfig;
