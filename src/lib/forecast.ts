// CashflowData import removed as it's not used in this file

export interface ForecastData {
  name: string;
  income: number;
  expense: number;
  predicted?: boolean;
}

export function calculateMovingAverage(data: number[], periods: number = 3): number {
  if (data.length === 0) return 0;
  const sum = data.slice(-periods).reduce((acc, val) => acc + val, 0);
  return sum / Math.min(periods, data.length);
}

export function generateForecast(historicalData: ForecastData[], months: number = 3): ForecastData[] {
  if (historicalData.length < 3) {
    return historicalData;
  }

  const incomeHistory = historicalData.map(d => d.income);
  const expenseHistory = historicalData.map(d => d.expense);
  
  const lastDate = new Date(historicalData[historicalData.length - 1].name);
  const forecast: ForecastData[] = [];

  for (let i = 1; i <= months; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setMonth(lastDate.getMonth() + i);
    const monthYear = nextDate.toLocaleString('default', { month: 'short', year: 'numeric' });

    const predictedIncome = calculateMovingAverage(incomeHistory.slice(-3));
    const predictedExpense = calculateMovingAverage(expenseHistory.slice(-3));

    forecast.push({
      name: monthYear,
      income: Number(predictedIncome.toFixed(2)),
      expense: Number(predictedExpense.toFixed(2)),
      predicted: true
    });

    // Add predictions to history for next calculation
    incomeHistory.push(predictedIncome);
    expenseHistory.push(predictedExpense);
  }

  return [...historicalData, ...forecast];
}