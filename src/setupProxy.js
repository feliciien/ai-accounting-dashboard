const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Enable proxy to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:4000',
      changeOrigin: true,
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error', details: err.message });
      }
    })
  );

  // Fallback route for when the proxy fails
  app.use('/api-fallback', (req, res) => {
    res.status(503).json({ 
      message: 'Backend service is currently unavailable. Please ensure the Express server is running on port 4000.',
      error: 'SERVICE_UNAVAILABLE'
    });
  });

  // Handle static assets that might be proxied
  app.use('/logo192.png', (req, res, next) => {
    // Fallback to local assets if proxy fails
    res.redirect('/fallback-logo.png');
  });
};