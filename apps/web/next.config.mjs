/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable prerendering for error pages to avoid styled-jsx issues
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  webpack: (config, { isServer }) => {
    // Ensure proper handling of styled-jsx during build
    if (isServer) {
      config.externals.push('@styled-jsx/plugin');
    }
    return config;
  },
};

export default nextConfig;
