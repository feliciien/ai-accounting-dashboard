// const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Disable API proxy to prevent ECONNREFUSED errors
  // Mock API responses instead of proxying to a non-existent backend
  app.use('/api', (req, res) => {
    console.log('Mock API request:', req.path);
    res.writeHead(200, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({ 
      message: 'This is a mock API response. Backend service is not available in this environment.',
      success: true,
      mockData: true
    }));
  });
  
  // If you need to enable the real proxy in the future, uncomment this code:
  /*
  const apiProxy = createProxyMiddleware('/api', {
    target: 'http://localhost:3001',
    changeOrigin: true,
    onError: (err, req, res) => {
      console.warn('Proxy error:', err);
      res.writeHead(500, {
        'Content-Type': 'application/json',
      });
      res.end(JSON.stringify({ 
        message: 'Backend service unavailable. Please try again later.',
        code: 'BACKEND_UNAVAILABLE'
      }));
    },
    proxyTimeout: 5000,
    timeout: 5000,
    logLevel: process.env.NODE_ENV === 'development' ? 'warn' : 'silent'
  });

  app.use('/api', apiProxy);
  */

  // Handle static assets that might be proxied
  app.use('/logo192.png', (req, res, next) => {
    // Fallback to local assets if proxy fails
    res.redirect('/fallback-logo.png');
  });
};