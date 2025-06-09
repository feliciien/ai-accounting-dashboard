/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['workfusionapp.com'],
  },
  // Enable static optimization
  experimental: {
    optimizeCss: true,
    optimizeImages: true,
  },
  // Configure headers for security and SEO
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseio.com https://*.firebase.com https://*.googleapis.com https://*.vercel-insights.com; connect-src 'self' https://*.firebaseio.com https://*.firebase.com https://*.firestore.googleapis.com https://api.openai.com https://*.vercel-insights.com; img-src 'self' data: https://*.firebaseio.com https://*.firebase.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'self' https://*.firebaseio.com https://*.firebase.com https://connect.stripe.com https://www.paypal.com;",
          },
        ],
      },
    ];
  },
  // Configure redirects for SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // Configure rewrites for clean URLs
  async rewrites() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/index',
      },
    ];
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      url: require.resolve('url/'),
      buffer: require.resolve('buffer/'),
      stream: require.resolve('stream-browserify'),
    };

    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    );

    return config;
  },
};

module.exports = nextConfig;