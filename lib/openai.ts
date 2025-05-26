import OpenAI from 'openai';

// Types for our financial data
interface CashflowData {
  date: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}



// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});

export async function getFinancialInsights(financialData: CashflowData[]) {
  try {
    const prompt = "Analyze this user's financial data and provide 3 actionable accounting insights. Format the answer as a bullet point list.";
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nFinancial Data:\n${JSON.stringify(financialData, null, 2)}`
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return response.choices[0]?.message.content || 'No insights available';
  } catch (error) {
    console.error('Error getting financial insights:', error);
    return 'Error analyzing financial data';
  }
}