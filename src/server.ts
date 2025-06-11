import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import chatRouter from './api/chat';
import integrationsRouter from './api/routes/integrations';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/integrations', integrationsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
