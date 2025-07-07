/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['a.espncdn.com'], // Add this line if 'images' object exists
    // If 'images' object doesn't exist, add the whole object like this:
    // images: {
    //   domains: ['a.espncdn.com'],
    // },
  },
};

module.exports = nextConfig;