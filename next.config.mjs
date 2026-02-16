/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure next/image is not used anywhere - all images use native <img>
  // If any next/image usage exists, this config will allow all local paths
  images: {
    unoptimized: true,
  },
}

export default nextConfig
