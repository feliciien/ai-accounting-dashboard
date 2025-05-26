import { getChatResponse } from '../../lib/openai';
import { CashflowData } from '../../lib/openai';

export interface ChatRequest {
  message: string;
  financialData: CashflowData[];
}

export interface ChatResponse {
  response: string;
}

export async function handleChatRequest(request: ChatRequest): Promise<ChatResponse> {
  try {
    const { message, financialData } = request;

    if (!message || !financialData) {
      throw new Error('Message and financial data are required');
    }

    const response = await getChatResponse(message, financialData);
    return { response };
  } catch (error) {
    console.error('Chat API error:', error);
    throw new Error('Failed to process chat request');
  }
}