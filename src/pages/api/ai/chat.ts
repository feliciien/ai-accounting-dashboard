import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Initialize OpenAI client (server-side only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Changed from REACT_APP_OPENAI_API_KEY
});

// Validate API key presence
if (!process.env.OPENAI_API_KEY) {
  console.error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model, temperature, max_tokens } = req.body;

    // Validate required parameters
    if (!messages) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    // Make the OpenAI API call server-side
    const response = await openai.chat.completions.create({
      model: model || 'gpt-3.5-turbo',
      messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 500,
    });

    // Return the response
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error calling OpenAI API:', error);
    return res.status(500).json({ 
      error: 'Error calling OpenAI API', 
      message: error.message || 'Unknown error'
    });
  }
}