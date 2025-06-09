import express from 'express';
import cors from 'cors';
import { AddressInfo } from 'net';

const app = express();
const PORT = Number(process.env.PORT) || 4000; // Use a different port (4000)
const HOST = '127.0.0.1'; // Explicitly bind to localhost

// Middleware
app.use(express.json());
// Configure CORS to allow requests from the React app
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({ status: 'ok', message: 'Server is running' });
});

// Simple chat endpoint
app.post('/api/chat', (req, res) => {
  try {
    console.log('Chat endpoint called with body:', req.body);
    const { message } = req.body;
    
    // Mock response for testing
    res.json({ 
      response: `This is a mock response to your message: "${message}". The actual AI integration will be connected once the server is fully configured.` 
    });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// Simple integrations endpoints
app.post('/api/integrations/xero/connect', (req, res) => {
  console.log('Xero connect endpoint called');
  res.json({ status: 'success', message: 'Xero connection endpoint' });
});

app.post('/api/integrations/paypal/connect', (req, res) => {
  console.log('PayPal connect endpoint called');
  res.json({ status: 'success', message: 'PayPal connection endpoint' });
});

app.post('/api/integrations/stripe/connect', (req, res) => {
  console.log('Stripe connect endpoint called');
  res.json({ status: 'success', message: 'Stripe connection endpoint' });
});

app.post('/api/integrations/bank/connect', (req, res) => {
  console.log('Bank connect endpoint called');
  res.json({ status: 'success', message: 'Bank connection endpoint' });
});

// Catch-all route for undefined API routes
app.use('/api/*', (req, res) => {
  console.log(`Undefined API route called: ${req.originalUrl}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server with better error handling
try {
  const server = app.listen(PORT, HOST, () => {
    const address = server.address() as AddressInfo;
    console.log(`Server is running at http://${HOST}:${address.port}`);
    console.log(`Health check available at http://${HOST}:${address.port}/api/health`);
    console.log(`Server address info:`, address);
    console.log(`Try accessing via: http://localhost:${address.port}/api/health or http://127.0.0.1:${address.port}/api/health`);
  });

  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please choose another port.`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Gracefully shutting down server...');
    server.close(() => {
      console.log('Server shut down successfully');
      process.exit(0);
    });
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}