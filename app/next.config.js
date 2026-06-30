// Import the default export correctly
const withSerwistInit = require("@serwist/next").default;
const withSerwist = withSerwistInit({
  // Path to service worker source file (relative to project root)
  swSrc: "./sw.ts",
  // Destination for generated service worker in the public folder
  swDest: "public/sw.js",
});

/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Polyfill Node.js core modules for client-side bundles
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
  // Add webpack customization to include polyfills on client side
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfill Node core modules
      config.plugins.push(new NodePolyfillPlugin());
      // Replace node: imports with bare module names
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
      // Provide fallbacks for core modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        util: require.resolve('util/'),
        buffer: require.resolve('buffer/'),
        fs: false,
        module: false,
      };
    }
    return config;
  },
};

module.exports = withSerwist(withBundleAnalyzer(nextConfig));
