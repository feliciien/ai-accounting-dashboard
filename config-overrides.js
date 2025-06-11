const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add polyfills
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: false,
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    url: require.resolve('url'),
    buffer: require.resolve('buffer'),
    stream: require.resolve('stream-browserify'),
    util: require.resolve('util'),
    process: require.resolve('process/browser'),
    zlib: require.resolve('browserify-zlib'),
    assert: require.resolve('assert'),
    crypto: require.resolve('crypto-browserify'),
  };

  // Add module rules for mjs files
  config.module.rules.push({
    test: /\.mjs$/,
    include: /node_modules/,
    type: 'javascript/auto'
  });

  // Fix for ESM modules trying to import process/browser
  config.module.rules.push({
    test: /\.(js|mjs)$/,
    resolve: {
      fullySpecified: false,
    },
  });

  // Add plugins
  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
      const mod = resource.request.replace(/^node:/, '');
      switch (mod) {
        case 'buffer':
          resource.request = 'buffer';
          break;
        case 'stream':
          resource.request = 'readable-stream';
          break;
        default:
          break;
      }
    }),
    // Fix for process/browser in ESM modules
    new webpack.NormalModuleReplacementPlugin(
      /process\/browser/,
      require.resolve('process/browser')
    ),
  ];

  return config;
};
