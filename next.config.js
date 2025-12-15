/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        bcrypt: false,
        'node-gyp': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;








