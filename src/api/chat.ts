import express from 'express';
import { CashflowData } from '../lib/openai';
import { getChatResponse } from '../lib/openai';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { message, financialData } = req.body;

    if (!message || !financialData) {
      return res.status(400).json({ error: 'Message and financial data are required' });
    }

    const response = await getChatResponse(message, financialData as CashflowData[]);
    res.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

export default router;