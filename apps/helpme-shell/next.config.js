//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/kseb',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
