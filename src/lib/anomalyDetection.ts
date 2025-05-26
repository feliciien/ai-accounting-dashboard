import { CashflowData } from './openai';

export interface AnomalyAlert {
  type: 'revenue_drop' | 'expense_spike' | 'balance_warning';
  title?: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  recommendation?: string;
}

interface MonthlyMetrics {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

const REVENUE_DROP_THRESHOLD = 0.2; // 20% drop
const EXPENSE_SPIKE_THRESHOLD = 0.3; // 30% increase
const BALANCE_WARNING_DAYS = 30; // Days to project balance
const MIN_BALANCE_THRESHOLD = 0; // Minimum acceptable balance

export function detectAnomalies(data: CashflowData[], forecastData: any[]): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  
  // Group data by month for trend analysis
  const monthlyMetrics = aggregateMonthlyMetrics(data);
  
  // Detect revenue drops
  const revenueDrops = detectRevenueDrops(monthlyMetrics);
  alerts.push(...revenueDrops);
  
  // Detect expense spikes
  const expenseSpikes = detectExpenseSpikes(monthlyMetrics);
  alerts.push(...expenseSpikes);
  
  // Check balance projections
  const balanceWarnings = checkBalanceProjections(monthlyMetrics, forecastData);
  alerts.push(...balanceWarnings);
  
  return alerts;
}

function aggregateMonthlyMetrics(data: CashflowData[]): MonthlyMetrics[] {
  const monthlyData = data.reduce((acc: { [key: string]: MonthlyMetrics }, curr) => {
    const month = new Date(curr.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    
    if (!acc[month]) {
      acc[month] = { month, income: 0, expense: 0, balance: 0 };
    }
    
    if (curr.type === 'income') {
      acc[month].income += curr.amount;
    } else {
      acc[month].expense += curr.amount;
    }
    
    acc[month].balance = acc[month].income - acc[month].expense;
    
    return acc;
  }, {});
  
  return Object.values(monthlyData).sort((a, b) => {
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  });
}

function detectRevenueDrops(metrics: MonthlyMetrics[]): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  
  for (let i = 1; i < metrics.length; i++) {
    const currentIncome = metrics[i].income;
    const previousIncome = metrics[i - 1].income;
    const drop = (previousIncome - currentIncome) / previousIncome;
    
    if (drop >= REVENUE_DROP_THRESHOLD) {
      alerts.push({
        type: 'revenue_drop',
        message: `Revenue dropped by ${(drop * 100).toFixed(1)}% in ${metrics[i].month}`,
        severity: drop >= 0.5 ? 'high' : drop >= 0.3 ? 'medium' : 'low',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return alerts;
}

function detectExpenseSpikes(metrics: MonthlyMetrics[]): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  
  for (let i = 1; i < metrics.length; i++) {
    const currentExpense = metrics[i].expense;
    const previousExpense = metrics[i - 1].expense;
    const spike = (currentExpense - previousExpense) / previousExpense;
    
    if (spike >= EXPENSE_SPIKE_THRESHOLD) {
      alerts.push({
        type: 'expense_spike',
        message: `Expenses increased by ${(spike * 100).toFixed(1)}% in ${metrics[i].month}`,
        severity: spike >= 0.5 ? 'high' : spike >= 0.4 ? 'medium' : 'low',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return alerts;
}

function checkBalanceProjections(metrics: MonthlyMetrics[], forecast: any[]): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  
  // Check forecasted data for potential negative balance
  forecast.forEach((month) => {
    const projectedBalance = month.income - month.expense;
    
    if (projectedBalance < MIN_BALANCE_THRESHOLD) {
      alerts.push({
        type: 'balance_warning',
        message: `Projected negative balance of $${Math.abs(projectedBalance).toFixed(2)} in ${month.name}`,
        severity: projectedBalance < -5000 ? 'high' : projectedBalance < -1000 ? 'medium' : 'low',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  return alerts;
}